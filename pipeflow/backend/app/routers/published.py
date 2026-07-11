import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.workflow import Workflow
from app.models.workflow_run import WorkflowRun
from app.schemas.workflow import WorkflowRunRequest

router = APIRouter(prefix="/api/published", tags=["published"])


@router.post("/{api_path:path}")
async def execute_published_workflow(
    api_path: str,
    request: WorkflowRunRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workflow).where(
            Workflow.published_api_path == api_path,
            Workflow.is_published == True,
        )
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published workflow not found",
        )

    from app.services.workflow_engine import run_workflow_dag

    run = WorkflowRun(
        workflow_id=workflow.id,
        version=workflow.version,
        status="pending",
        trigger_type="api",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    import asyncio
    from app.core.database import async_session

    async def run_in_session():
        async with async_session() as session:
            await run_workflow_dag(session, workflow, run.id, request.input_data)

    asyncio.create_task(run_in_session())

    result_run = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run.id))
    run = result_run.scalar_one()

    nodes = workflow.get_nodes()
    snapshots = []
    if run.snapshots:
        for s in run.snapshots:
            snapshots.append({
                "node_id": s.node_id,
                "node_label": s.node_label,
                "status": s.status,
                "output_data": s.output_data,
            })

    return {
        "run_id": run.id,
        "status": run.status,
        "nodes": snapshots,
    }
