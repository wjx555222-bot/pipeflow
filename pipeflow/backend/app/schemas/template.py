from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str
    nodes: str
    edges: str
    tags: str
    usage_count: int
    is_featured: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int


class TemplateImportRequest(BaseModel):
    workflow_name: Optional[str] = None
