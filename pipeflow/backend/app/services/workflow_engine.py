import asyncio
import io
import json
import re
import sys
from collections import defaultdict, deque
from datetime import datetime
from typing import Any, Callable, Coroutine, Dict, List

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.websocket import connection_manager
from app.models.workflow import Workflow
from app.models.workflow_run import WorkflowRun, NodeRunSnapshot

from dataclasses import dataclass, field


@dataclass
class WorkflowNode:
    id: str
    type: str
    label: str = ""
    position: dict = field(default_factory=lambda: {"x": 0, "y": 0})
    config: dict = field(default_factory=dict)
    input_mapping: dict = field(default_factory=dict)


@dataclass
class NodeEdge:
    source_node_id: str
    target_node_id: str
    source_handle: str | None = None
    target_handle: str | None = None
    condition: str | None = None

logger = get_logger(__name__)

NodeExecutor = Callable[
    [Dict[str, Any], Dict[str, Any]],
    Coroutine[Any, Any, str],
]


def parse_dag(
    nodes: List[WorkflowNode], edges: List[NodeEdge]
) -> Dict[str, Any]:
    adjacency: Dict[str, List[NodeEdge]] = defaultdict(list)
    indegree: Dict[str, int] = {node.id: 0 for node in nodes}
    reverse_adjacency: Dict[str, List[str]] = defaultdict(list)

    for edge in edges:
        adjacency[edge.source_node_id].append(edge)
        indegree[edge.target_node_id] = indegree.get(edge.target_node_id, 0) + 1
        reverse_adjacency[edge.target_node_id].append(edge.source_node_id)

    node_map: Dict[str, WorkflowNode] = {node.id: node for node in nodes}

    return {
        "adjacency": adjacency,
        "indegree": indegree,
        "reverse_adjacency": reverse_adjacency,
        "node_map": node_map,
    }


def topological_sort(
    nodes: List[WorkflowNode], edges: List[NodeEdge]
) -> List[List[str]]:
    dag = parse_dag(nodes, edges)
    indegree = dag["indegree"].copy()
    adjacency = dag["adjacency"]

    queue = deque([nid for nid, deg in indegree.items() if deg == 0])
    groups: List[List[str]] = []
    processed = 0
    total = len(nodes)

    while queue:
        group = list(queue)
        groups.append(group)
        next_queue = deque()
        for node_id in group:
            processed += 1
            for edge in adjacency.get(node_id, []):
                target = edge.target_node_id
                indegree[target] -= 1
                if indegree[target] == 0:
                    next_queue.append(target)
        queue = next_queue

    if processed != total:
        remaining = [nid for nid, deg in indegree.items() if deg > 0]
        logger.warning("Cycle detected in DAG, remaining nodes: %s", remaining)
        if remaining:
            groups.append(remaining)

    return groups


async def execute_llm_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    try:
        from langchain_openai import ChatOpenAI
    except ImportError:
        return json.dumps({"error": "langchain_openai not installed"})

    model_name = config.get("model", settings.deepseek_model)
    system_prompt = config.get("system_prompt", "You are a helpful assistant.")
    user_prompt_template = config.get("user_prompt", "{input}")
    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("max_tokens", 2048)

    try:
        user_prompt = user_prompt_template.format(**inputs, input=json.dumps(inputs, ensure_ascii=False))
    except (KeyError, ValueError):
        user_prompt = user_prompt_template.replace("{input}", json.dumps(inputs, ensure_ascii=False))

    try:
        llm = ChatOpenAI(
            model=model_name,
            api_key=settings.deepseek_api_key or "sk-placeholder",
            base_url=settings.deepseek_base_url,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        response = await llm.ainvoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
        return response.content
    except Exception as e:
        return json.dumps({"error": f"LLM call failed: {str(e)}"})


async def execute_code_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    code = config.get("code", "")
    if not code:
        return json.dumps({"error": "No code provided"})

    old_stdout = sys.stdout
    sys.stdout = captured = io.StringIO()

    sandbox_globals = {
        "__builtins__": {
            "print": print,
            "len": len,
            "range": range,
            "int": int,
            "float": float,
            "str": str,
            "bool": bool,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "enumerate": enumerate,
            "zip": zip,
            "map": map,
            "filter": filter,
            "sorted": sorted,
            "reversed": reversed,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "isinstance": isinstance,
            "json": json,
            "re": re,
        },
        "inputs": inputs,
        "result": None,
    }
    sandbox_locals: Dict[str, Any] = {}

    try:
        exec(code, sandbox_globals, sandbox_locals)
        output = captured.getvalue()
        if "result" in sandbox_locals:
            output += "\n" + json.dumps({"result": sandbox_locals["result"]}, ensure_ascii=False)
        return output.strip() or json.dumps({"status": "executed"})
    except Exception as e:
        return json.dumps({"error": f"Code execution failed: {str(e)}"})
    finally:
        sys.stdout = old_stdout


async def execute_http_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    url = config.get("url", "")
    method = config.get("method", "GET").upper()
    headers = config.get("headers", {})
    body_template = config.get("body", "")

    if not url:
        return json.dumps({"error": "No URL provided"})

    body = None
    if body_template:
        try:
            body_str = body_template.format(**inputs, input=json.dumps(inputs))
            body = json.loads(body_str)
        except (KeyError, ValueError, json.JSONDecodeError):
            body = body_template

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=body if isinstance(body, dict) else None,
                content=body if isinstance(body, str) and not isinstance(body, dict) else None,
            )
            response.raise_for_status()
            return response.text
        except Exception as e:
            return json.dumps({"error": f"HTTP request failed: {str(e)}"})


async def execute_branch_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    condition = config.get("condition", "True")

    sandbox = {"__builtins__": {}, **inputs}

    try:
        result = eval(condition, {"__builtins__": {}}, sandbox)
        if isinstance(result, bool):
            return "true" if result else "false"
        return str(result)
    except Exception as e:
        return json.dumps({"error": f"Branch evaluation failed: {str(e)}", "default": "false"})


async def execute_loop_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    loop_items = inputs.get("items", [])
    if not loop_items:
        return json.dumps({"items_processed": 0, "results": []})
    return json.dumps({"items_processed": len(loop_items), "results": loop_items})


async def execute_subworkflow_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    subworkflow_id = config.get("workflow_id", "")
    return json.dumps({
        "status": "subworkflow_placeholder",
        "workflow_id": subworkflow_id,
        "inputs": inputs,
    })


async def execute_tool_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    tool_name = config.get("tool", "default")
    tool_config = config.get("tool_config", {})

    tools = {
        "calculator": lambda inp: str(eval(str(inp.get("expression", "0")), {"__builtins__": {}}, {})),
        "json_parser": lambda inp: json.dumps(json.loads(inp.get("text", "{}")), indent=2),
        "text_formatter": lambda inp: inp.get("template", "{input}").format(**inp),
        "default": lambda inp: json.dumps({"tool": tool_name, "inputs": inp}),
    }

    handler = tools.get(tool_name, tools["default"])
    try:
        return handler({**inputs, **tool_config})
    except Exception as e:
        return json.dumps({"error": f"Tool execution failed: {str(e)}"})


async def execute_merge_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    merge_strategy = config.get("strategy", "combine")
    if merge_strategy == "first":
        first_key = next(iter(inputs), None)
        return json.dumps(inputs.get(first_key, {}) if first_key else inputs, ensure_ascii=False)
    elif merge_strategy == "concat":
        results = []
        for key, value in inputs.items():
            results.append(str(value))
        return "\n".join(results)
    else:
        return json.dumps(inputs, ensure_ascii=False)


async def execute_input_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    default_value = config.get("default_value", "")
    if inputs:
        return json.dumps(inputs, ensure_ascii=False)
    return str(default_value)


async def execute_output_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    format_template = config.get("format", "{data}")
    try:
        return format_template.format(data=json.dumps(inputs, ensure_ascii=False), **inputs)
    except (KeyError, ValueError):
        return json.dumps(inputs, ensure_ascii=False)


async def execute_normalize_node(config: Dict[str, Any], inputs: Dict[str, Any]) -> str:
    schema = config.get("schema", {})
    if not schema:
        return json.dumps(inputs, ensure_ascii=False)
    normalized = {}
    for key, default in schema.items():
        normalized[key] = inputs.get(key, default)
    return json.dumps(normalized, ensure_ascii=False)


NODE_EXECUTORS: Dict[str, NodeExecutor] = {
    "llm": execute_llm_node,
    "code": execute_code_node,
    "http": execute_http_node,
    "branch": execute_branch_node,
    "loop": execute_loop_node,
    "subworkflow": execute_subworkflow_node,
    "tool": execute_tool_node,
    "merge": execute_merge_node,
    "normalize": execute_normalize_node,
    "input": execute_input_node,
    "output": execute_output_node,
}


async def execute_node(
    node_type: str, config: Dict[str, Any], inputs: Dict[str, Any]
) -> str:
    executor = NODE_EXECUTORS.get(node_type)
    if executor is None:
        return json.dumps({"error": f"Unknown node type: {node_type}"})
    return await executor(config, inputs)


def _get_predecessor_outputs(
    node_id: str,
    reverse_adjacency: Dict[str, List[str]],
    snapshots: Dict[str, NodeRunSnapshot],
    edges: List[NodeEdge],
) -> Dict[str, Any]:
    pred_node_ids = reverse_adjacency.get(node_id, [])
    if not pred_node_ids:
        return {}

    edge_map: Dict[str, List[NodeEdge]] = defaultdict(list)
    for edge in edges:
        if edge.target_node_id == node_id:
            edge_map[edge.source_node_id].append(edge)

    inputs: Dict[str, Any] = {}
    for pred_id in pred_node_ids:
        snapshot = snapshots.get(pred_id)
        if snapshot is None:
            continue
        try:
            output = json.loads(snapshot.output_data) if snapshot.output_data else {}
        except json.JSONDecodeError:
            output = {"raw": snapshot.output_data}

        related_edges = edge_map.get(pred_id, [])
        if related_edges:
            for edge in related_edges:
                source_handle = edge.source_handle or "default"
                inputs[source_handle] = output
        else:
            inputs[pred_id] = output

    if len(inputs) == 1:
        single_key = next(iter(inputs))
        return inputs[single_key] if isinstance(inputs[single_key], dict) else {"value": inputs[single_key]}

    return inputs


async def _execute_single_node(
    db: AsyncSession,
    run: WorkflowRun,
    node: WorkflowNode,
    execution_order: int,
    reverse_adjacency: Dict[str, List[str]],
    snapshots_dict: Dict[str, NodeRunSnapshot],
    edges: List[NodeEdge],
) -> NodeRunSnapshot:
    snapshot = NodeRunSnapshot(
        run_id=run.id,
        node_id=node.id,
        node_type=node.type,
        node_label=node.label,
        status="pending",
        execution_order=execution_order,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)

    snapshots_dict[node.id] = snapshot

    await connection_manager.send_log(
        int(run.id) if run.id.isdigit() else hash(run.id) % 100000,
        node.id,
        f"Node {node.label} ({node.type}) starting",
    )

    snapshot.status = "running"
    snapshot.started_at = datetime.utcnow()
    await db.commit()

    try:
        inputs = _get_predecessor_outputs(node.id, reverse_adjacency, snapshots_dict, edges)

        result = await execute_node(node.type, node.config, inputs)

        snapshot.output_data = result
        snapshot.status = "completed"
        snapshot.completed_at = datetime.utcnow()

        await connection_manager.send_log(
            int(run.id) if run.id.isdigit() else hash(run.id) % 100000,
            node.id,
            f"Node {node.label} ({node.type}) completed",
        )
    except Exception as e:
        logger.error("Node %s execution failed: %s", node.id, str(e))
        snapshot.status = "failed"
        snapshot.error_message = str(e)
        snapshot.completed_at = datetime.utcnow()

        await connection_manager.send_error(
            int(run.id) if run.id.isdigit() else hash(run.id) % 100000,
            f"Node {node.label} failed: {str(e)}",
        )

    await db.commit()
    await db.refresh(snapshot)

    run.completed_nodes = len([s for s in snapshots_dict.values() if s.status in ("completed", "skipped")])
    await db.commit()

    await connection_manager.send_progress(
        int(run.id) if run.id.isdigit() else hash(run.id) % 100000,
        {
            "node_id": node.id,
            "node_status": snapshot.status,
            "completed_nodes": run.completed_nodes,
            "total_nodes": run.total_nodes,
        },
    )

    return snapshot


async def run_workflow_dag(
    db: AsyncSession,
    workflow: Workflow,
    run_id: str,
    input_data: Dict[str, Any],
) -> None:
    nodes = workflow.get_nodes()
    edges = workflow.get_edges()

    dag = parse_dag(nodes, edges)
    node_map = dag["node_map"]
    reverse_adjacency = dag["reverse_adjacency"]

    execution_groups = topological_sort(nodes, edges)

    run_result = await db.execute(select(WorkflowRun).where(WorkflowRun.id == run_id))
    run = run_result.scalar_one_or_none()
    if run is None:
        return

    run.status = "running"
    run.started_at = datetime.utcnow()
    run.total_nodes = len(nodes)
    await db.commit()

    run_key = int(run_id) if run_id.isdigit() else hash(run_id) % 100000
    await connection_manager.send_progress(
        run_key,
        {"status": "running", "total_nodes": len(nodes), "execution_groups": len(execution_groups)},
    )

    snapshots_dict: Dict[str, NodeRunSnapshot] = {}

    execution_order = 0
    error_occurred = False

    for group_idx, group in enumerate(execution_groups):
        if error_occurred:
            for node_id in group:
                node = node_map.get(node_id)
                if node is None:
                    continue
                snapshot = NodeRunSnapshot(
                    run_id=run.id,
                    node_id=node.id,
                    node_type=node.type,
                    node_label=node.label,
                    status="skipped",
                    execution_order=execution_order,
                    error_message="Skipped due to upstream failure",
                )
                db.add(snapshot)
                snapshots_dict[node.id] = snapshot
            execution_order += len(group)
            await db.commit()
            continue

        tasks = []
        for node_id in group:
            node = node_map.get(node_id)
            if node is None:
                continue
            order = execution_order
            execution_order += 1
            tasks.append(
                _execute_single_node(
                    db=db,
                    run=run,
                    node=node,
                    execution_order=order,
                    reverse_adjacency=reverse_adjacency,
                    snapshots_dict=snapshots_dict,
                    edges=edges,
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.error("Group %d execution error: %s", group_idx, str(result))
                error_occurred = True
            elif isinstance(result, NodeRunSnapshot) and result.status == "failed":
                error_occurred = True

    run.status = "failed" if error_occurred else "completed"
    run.completed_at = datetime.utcnow()
    await db.commit()

    await connection_manager.send_progress(
        run_key,
        {"status": run.status, "completed_at": run.completed_at.isoformat() if run.completed_at else None},
    )
