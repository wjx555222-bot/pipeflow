import asyncio
import json
from typing import Any, Dict, List

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, workflow_run_id: int):
        await ws.accept()
        if workflow_run_id not in self._connections:
            self._connections[workflow_run_id] = []
        self._connections[workflow_run_id].append(ws)
        logger.info("WebSocket connected to run %d, total: %d", workflow_run_id, len(self._connections[workflow_run_id]))

    def disconnect(self, ws: WebSocket, workflow_run_id: int):
        if workflow_run_id in self._connections:
            self._connections[workflow_run_id] = [
                conn for conn in self._connections[workflow_run_id] if conn != ws
            ]
            if not self._connections[workflow_run_id]:
                del self._connections[workflow_run_id]
        logger.info("WebSocket disconnected from run %d", workflow_run_id)

    async def send_progress(self, run_id: int, message: Dict[str, Any]):
        data = {
            "type": "progress",
            "run_id": run_id,
            **message,
        }
        await self.broadcast_to_run(run_id, data)

    async def send_log(self, run_id: int, node_id: str, log_message: str):
        data = {
            "type": "log",
            "run_id": run_id,
            "node_id": node_id,
            "message": log_message,
            "level": "info",
        }
        await self.broadcast_to_run(run_id, data)

    async def send_error(self, run_id: int, error: str):
        data = {
            "type": "error",
            "run_id": run_id,
            "message": error,
        }
        await self.broadcast_to_run(run_id, data)

    async def broadcast_to_run(self, run_id: int, data: Dict[str, Any]):
        if run_id not in self._connections:
            return
        message = json.dumps(data)
        disconnected = []
        for ws in self._connections[run_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws, run_id)


connection_manager = ConnectionManager()
