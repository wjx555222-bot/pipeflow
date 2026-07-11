from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class NodeDefinition(BaseModel):
    id: str
    type: str
    label: str
    position: Dict[str, float]
    config: Dict[str, Any] = {}
    input_mapping: Dict[str, Any] = {}


class EdgeDefinition(BaseModel):
    source_node_id: str
    target_node_id: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    condition: Optional[str] = None


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    nodes: List[NodeDefinition] = []
    edges: List[EdgeDefinition] = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[NodeDefinition]] = None
    edges: Optional[List[EdgeDefinition]] = None


class WorkflowResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    nodes: List[NodeDefinition]
    edges: List[EdgeDefinition]
    version: int
    is_published: bool
    published_api_path: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    id: str
    name: str
    description: str
    version: int
    is_published: bool
    published_api_path: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowRunRequest(BaseModel):
    input_data: Dict[str, Any] = {}
    trigger_type: str = "manual"


class WorkflowRunResponse(BaseModel):
    id: str
    workflow_id: str
    version: int
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    trigger_type: str
    total_nodes: int
    completed_nodes: int
    error_message: Optional[str]

    model_config = {"from_attributes": True}


class NodeRunSnapshotResponse(BaseModel):
    id: str
    node_id: str
    node_type: str
    node_label: str
    input_data: str
    output_data: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    execution_order: int

    model_config = {"from_attributes": True}


class WorkflowRunDetailResponse(WorkflowRunResponse):
    snapshots: List[NodeRunSnapshotResponse] = []


class WorkflowRunListResponse(BaseModel):
    runs: List[WorkflowRunResponse]
    total: int


class PublishRequest(BaseModel):
    api_path: str = Field(..., pattern=r"^[a-zA-Z0-9\-_/]+$")
