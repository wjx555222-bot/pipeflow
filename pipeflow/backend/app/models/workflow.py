import json
from datetime import datetime
from typing import Any
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.user import gen_uuid


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    nodes: Mapped[str] = mapped_column(Text, default="[]")
    edges: Mapped[str] = mapped_column(Text, default="[]")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_api_path: Mapped[str] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="workflows")
    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowRun.started_at.desc()"
    )

    def get_nodes(self) -> list[dict[str, Any]]:
        return json.loads(self.nodes) if self.nodes else []

    def get_edges(self) -> list[dict[str, Any]]:
        return json.loads(self.edges) if self.edges else []


def parse_nodes(nodes_json: str) -> list[dict[str, Any]]:
    if not nodes_json:
        return []
    return json.loads(nodes_json)


def parse_edges(edges_json: str) -> list[dict[str, Any]]:
    if not edges_json:
        return []
    return json.loads(edges_json)


def serialize_nodes(nodes: list[dict[str, Any]]) -> str:
    return json.dumps(nodes)


def serialize_edges(edges: list[dict[str, Any]]) -> str:
    return json.dumps(edges)
