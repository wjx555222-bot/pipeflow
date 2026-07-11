from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.workflow_template import WorkflowTemplate
from app.schemas.template import TemplateImportRequest, TemplateListResponse, TemplateResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    category: str = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(WorkflowTemplate)
    if category:
        query = query.where(WorkflowTemplate.category == category)
    query = query.order_by(WorkflowTemplate.is_featured.desc(), WorkflowTemplate.usage_count.desc())

    result = await db.execute(query)
    templates = result.scalars().all()

    return TemplateListResponse(
        templates=[TemplateResponse.model_validate(t) for t in templates],
        total=len(templates),
    )


@router.post("/{template_id}/import")
async def import_template(
    template_id: str,
    data: TemplateImportRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models.workflow import Workflow

    result = await db.execute(
        select(WorkflowTemplate).where(WorkflowTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    template.usage_count += 1

    workflow = Workflow(
        user_id=current_user.id,
        name=data.workflow_name if data and data.workflow_name else f"{template.name} (imported)",
        description=template.description,
        nodes=template.nodes,
        edges=template.edges,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    return {
        "id": workflow.id,
        "name": workflow.name,
        "message": "Template imported successfully",
    }
