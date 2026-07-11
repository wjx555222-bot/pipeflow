import json
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import async_session, get_db
from app.core.websocket import connection_manager
from app.models.user import User
from app.models.workflow import Workflow
from app.models.workflow_run import NodeRunSnapshot, WorkflowRun
from app.schemas.workflow import (
    PublishRequest,
    WorkflowCreate,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowRunDetailResponse,
    WorkflowRunListResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowUpdate,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("", response_model=Dict)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Workflow).where(Workflow.user_id == current_user.id)
    if search:
        query = query.where(Workflow.name.contains(search))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(desc(Workflow.updated_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    workflows = result.scalars().all()

    return {
        "workflows": [WorkflowListResponse.model_validate(w) for w in workflows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = Workflow(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        nodes=json.dumps([n.model_dump() for n in data.nodes]),
        edges=json.dumps([e.model_dump() for e in data.edges]),
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    return WorkflowResponse(
        id=workflow.id,
        user_id=workflow.user_id,
        name=workflow.name,
        description=workflow.description,
        nodes=workflow.get_nodes(),
        edges=workflow.get_edges(),
        version=workflow.version,
        is_published=workflow.is_published,
        published_api_path=workflow.published_api_path,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    return WorkflowResponse(
        id=workflow.id,
        user_id=workflow.user_id,
        name=workflow.name,
        description=workflow.description,
        nodes=workflow.get_nodes(),
        edges=workflow.get_edges(),
        version=workflow.version,
        is_published=workflow.is_published,
        published_api_path=workflow.published_api_path,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    if data.name is not None:
        workflow.name = data.name
    if data.description is not None:
        workflow.description = data.description
    if data.nodes is not None:
        workflow.nodes = json.dumps([n.model_dump() for n in data.nodes])
        workflow.version += 1
    if data.edges is not None:
        workflow.edges = json.dumps([e.model_dump() for e in data.edges])
        workflow.version += 1

    workflow.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(workflow)

    return WorkflowResponse(
        id=workflow.id,
        user_id=workflow.user_id,
        name=workflow.name,
        description=workflow.description,
        nodes=workflow.get_nodes(),
        edges=workflow.get_edges(),
        version=workflow.version,
        is_published=workflow.is_published,
        published_api_path=workflow.published_api_path,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    await db.delete(workflow)
    await db.commit()


@router.post("/{workflow_id}/execute", response_model=WorkflowRunResponse)
async def execute_workflow(
    workflow_id: str,
    data: WorkflowRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    run = WorkflowRun(
        workflow_id=workflow.id,
        version=workflow.version,
        status="pending",
        trigger_type=data.trigger_type,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    run_id = run.id

    async def run_in_session():
        async with async_session() as session:
            from app.services.workflow_engine import run_workflow_dag
            await run_workflow_dag(session, workflow, run_id, data.input_data)

    background_tasks.add_task(run_in_session)

    return WorkflowRunResponse.model_validate(run)


@router.get("/{workflow_id}/runs", response_model=WorkflowRunListResponse)
async def list_workflow_runs(
    workflow_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    count_query = select(func.count()).select_from(
        select(WorkflowRun).where(WorkflowRun.workflow_id == workflow_id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    runs_query = (
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id)
        .order_by(desc(WorkflowRun.completed_at), desc(WorkflowRun.started_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    runs_result = await db.execute(runs_query)
    runs = runs_result.scalars().all()

    return WorkflowRunListResponse(
        runs=[WorkflowRunResponse.model_validate(r) for r in runs],
        total=total,
    )


@router.get("/{workflow_id}/runs/{run_id}", response_model=WorkflowRunDetailResponse)
async def get_workflow_run(
    workflow_id: str,
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    run_result = await db.execute(
        select(WorkflowRun).where(WorkflowRun.id == run_id, WorkflowRun.workflow_id == workflow_id)
    )
    run = run_result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    from app.schemas.workflow import NodeRunSnapshotResponse

    snapshots = []
    if run.snapshots:
        snapshots = [NodeRunSnapshotResponse.model_validate(s) for s in run.snapshots]

    return WorkflowRunDetailResponse(
        id=run.id,
        workflow_id=run.workflow_id,
        version=run.version,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        trigger_type=run.trigger_type,
        total_nodes=run.total_nodes,
        completed_nodes=run.completed_nodes,
        error_message=run.error_message,
        snapshots=snapshots,
    )


@router.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: int):
    await connection_manager.connect(websocket, run_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, run_id)


@router.post("/{workflow_id}/publish")
async def publish_workflow(
    workflow_id: str,
    data: PublishRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    existing = await db.execute(
        select(Workflow).where(
            Workflow.published_api_path == data.api_path,
            Workflow.is_published == True,
            Workflow.id != workflow_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API path already in use",
        )

    workflow.is_published = True
    workflow.published_api_path = data.api_path
    await db.commit()

    return {"message": "Workflow published", "api_path": data.api_path}


@router.post("/{workflow_id}/rollback/{version}")
async def rollback_workflow(
    workflow_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    if version >= workflow.version or version < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid version for rollback",
        )

    workflow.version = version
    workflow.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": f"Rolled back to version {version}", "version": workflow.version}


@router.get("/{workflow_id}/versions")
async def list_versions(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.user_id == current_user.id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    return {
        "workflow_id": workflow_id,
        "current_version": workflow.version,
        "versions": list(range(1, workflow.version + 1)),
    }
