import json

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.workflow_template import WorkflowTemplate

logger = get_logger(__name__)

BUILTIN_TEMPLATES = [
    {
        "name": "Simple Q&A Pipeline",
        "description": "A simple question-answering pipeline: input → LLM → output",
        "category": "llm",
        "icon": "chat",
        "tags": "qa,llm,simple",
        "is_featured": True,
        "nodes": json.dumps([
            {
                "id": "input-1",
                "type": "input",
                "label": "Question Input",
                "position": {"x": 100, "y": 200},
                "config": {"default_value": ""},
                "input_mapping": {},
            },
            {
                "id": "llm-1",
                "type": "llm",
                "label": "AI Answer",
                "position": {"x": 400, "y": 200},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "You are a helpful AI assistant. Answer the user's question accurately and concisely.",
                    "user_prompt": "{input}",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
                "input_mapping": {},
            },
            {
                "id": "output-1",
                "type": "output",
                "label": "Response Output",
                "position": {"x": 700, "y": 200},
                "config": {"format": "{data}"},
                "input_mapping": {},
            },
        ]),
        "edges": json.dumps([
            {"source_node_id": "input-1", "target_node_id": "llm-1"},
            {"source_node_id": "llm-1", "target_node_id": "output-1"},
        ]),
    },
    {
        "name": "Code Review Pipeline",
        "description": "Submit code → AI review → fix suggestions → output",
        "category": "code",
        "icon": "code",
        "tags": "code,review,llm",
        "is_featured": True,
        "nodes": json.dumps([
            {
                "id": "input-1",
                "type": "input",
                "label": "Code Input",
                "position": {"x": 100, "y": 200},
                "config": {"default_value": ""},
                "input_mapping": {},
            },
            {
                "id": "llm-review",
                "type": "llm",
                "label": "AI Code Review",
                "position": {"x": 400, "y": 100},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "You are an expert code reviewer. Analyze the code for bugs, performance issues, security vulnerabilities, and style improvements.",
                    "user_prompt": "Please review the following code:\n\n{input}",
                    "temperature": 0.3,
                    "max_tokens": 2048,
                },
                "input_mapping": {},
            },
            {
                "id": "llm-fix",
                "type": "llm",
                "label": "AI Fix Generator",
                "position": {"x": 700, "y": 100},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "You are a code fixer. Based on the review, generate the corrected code.",
                    "user_prompt": "Based on this review, provide the fixed code:\n\n{input}",
                    "temperature": 0.2,
                    "max_tokens": 4096,
                },
                "input_mapping": {},
            },
            {
                "id": "output-1",
                "type": "output",
                "label": "Review & Fixes",
                "position": {"x": 1000, "y": 200},
                "config": {"format": "{data}"},
                "input_mapping": {},
            },
        ]),
        "edges": json.dumps([
            {"source_node_id": "input-1", "target_node_id": "llm-review"},
            {"source_node_id": "llm-review", "target_node_id": "llm-fix"},
            {"source_node_id": "llm-fix", "target_node_id": "output-1"},
        ]),
    },
    {
        "name": "Web Research Pipeline",
        "description": "Query → LLM generates search → fetch web → normalize → summarize → output",
        "category": "research",
        "icon": "globe",
        "tags": "web,research,llm,http",
        "is_featured": True,
        "nodes": json.dumps([
            {
                "id": "input-1",
                "type": "input",
                "label": "Research Topic",
                "position": {"x": 100, "y": 200},
                "config": {"default_value": ""},
                "input_mapping": {},
            },
            {
                "id": "llm-query",
                "type": "llm",
                "label": "Query Generator",
                "position": {"x": 350, "y": 200},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "Generate a URL for researching the given topic.",
                    "user_prompt": "Generate a search URL for: {input}",
                    "temperature": 0.5,
                    "max_tokens": 512,
                },
                "input_mapping": {},
            },
            {
                "id": "http-1",
                "type": "http",
                "label": "Fetch Web Content",
                "position": {"x": 600, "y": 200},
                "config": {
                    "method": "GET",
                    "url": "https://httpbin.org/get",
                    "headers": {},
                },
                "input_mapping": {},
            },
            {
                "id": "normalize-1",
                "type": "normalize",
                "label": "Normalize Data",
                "position": {"x": 850, "y": 200},
                "config": {
                    "schema": {
                        "content": "",
                        "source": "",
                        "timestamp": "",
                    }
                },
                "input_mapping": {},
            },
            {
                "id": "llm-summary",
                "type": "llm",
                "label": "AI Summarizer",
                "position": {"x": 1100, "y": 200},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "Summarize the research findings concisely.",
                    "user_prompt": "Summarize this content:\n\n{input}",
                    "temperature": 0.5,
                    "max_tokens": 1024,
                },
                "input_mapping": {},
            },
            {
                "id": "output-1",
                "type": "output",
                "label": "Research Report",
                "position": {"x": 1350, "y": 200},
                "config": {"format": "# Research Report\n\n{data}"},
                "input_mapping": {},
            },
        ]),
        "edges": json.dumps([
            {"source_node_id": "input-1", "target_node_id": "llm-query"},
            {"source_node_id": "llm-query", "target_node_id": "http-1"},
            {"source_node_id": "http-1", "target_node_id": "normalize-1"},
            {"source_node_id": "normalize-1", "target_node_id": "llm-summary"},
            {"source_node_id": "llm-summary", "target_node_id": "output-1"},
        ]),
    },
    {
        "name": "Multi-Branch Pipeline",
        "description": "Input → branch → [LLM-A, LLM-B] parallel → merge → output",
        "category": "advanced",
        "icon": "git-branch",
        "tags": "branch,parallel,llm",
        "is_featured": True,
        "nodes": json.dumps([
            {
                "id": "input-1",
                "type": "input",
                "label": "Task Input",
                "position": {"x": 100, "y": 200},
                "config": {"default_value": ""},
                "input_mapping": {},
            },
            {
                "id": "branch-1",
                "type": "branch",
                "label": "Route Decision",
                "position": {"x": 350, "y": 200},
                "config": {"condition": "True"},
                "input_mapping": {},
            },
            {
                "id": "llm-a",
                "type": "llm",
                "label": "LLM Path A",
                "position": {"x": 600, "y": 80},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "You are analyzing from perspective A.",
                    "user_prompt": "Analyze from perspective A: {input}",
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
                "input_mapping": {},
            },
            {
                "id": "llm-b",
                "type": "llm",
                "label": "LLM Path B",
                "position": {"x": 600, "y": 320},
                "config": {
                    "model": "deepseek-chat",
                    "system_prompt": "You are analyzing from perspective B.",
                    "user_prompt": "Analyze from perspective B: {input}",
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
                "input_mapping": {},
            },
            {
                "id": "merge-1",
                "type": "merge",
                "label": "Merge Results",
                "position": {"x": 850, "y": 200},
                "config": {"strategy": "combine"},
                "input_mapping": {},
            },
            {
                "id": "output-1",
                "type": "output",
                "label": "Combined Output",
                "position": {"x": 1100, "y": 200},
                "config": {"format": "{data}"},
                "input_mapping": {},
            },
        ]),
        "edges": json.dumps([
            {"source_node_id": "input-1", "target_node_id": "branch-1"},
            {"source_node_id": "branch-1", "target_node_id": "llm-a", "source_handle": "true"},
            {"source_node_id": "branch-1", "target_node_id": "llm-b", "source_handle": "false"},
            {"source_node_id": "llm-a", "target_node_id": "merge-1"},
            {"source_node_id": "llm-b", "target_node_id": "merge-1"},
            {"source_node_id": "merge-1", "target_node_id": "output-1"},
        ]),
    },
    {
        "name": "Data Processing Pipeline",
        "description": "Input → code(extract) → code(transform) → code(analyze) → output",
        "category": "data",
        "icon": "database",
        "tags": "data,code,transform",
        "is_featured": False,
        "nodes": json.dumps([
            {
                "id": "input-1",
                "type": "input",
                "label": "Raw Data",
                "position": {"x": 100, "y": 200},
                "config": {"default_value": '{"values": [1,2,3,4,5,6,7,8,9,10]}'},
                "input_mapping": {},
            },
            {
                "id": "code-extract",
                "type": "code",
                "label": "Extract Data",
                "position": {"x": 350, "y": 200},
                "config": {
                    "code": "import json\ndata = json.loads(inputs.get('value', '{}'))\nvalues = data.get('values', [])\nresult = {'extracted': values, 'count': len(values)}\nprint(json.dumps(result))"
                },
                "input_mapping": {},
            },
            {
                "id": "code-transform",
                "type": "code",
                "label": "Transform Data",
                "position": {"x": 600, "y": 200},
                "config": {
                    "code": "import json\ntry:\n    prev = json.loads(inputs.get('value', '{}'))\nexcept:\n    prev = inputs.get('value', {})\nvalues = prev.get('extracted', [])\ntransformed = {'doubled': [v*2 for v in values], 'squared': [v**2 for v in values], 'total': sum(values)}\nresult = transformed\nprint(json.dumps(result))"
                },
                "input_mapping": {},
            },
            {
                "id": "code-analyze",
                "type": "code",
                "label": "Analyze Results",
                "position": {"x": 850, "y": 200},
                "config": {
                    "code": "import json\ntry:\n    prev = json.loads(inputs.get('value', '{}'))\nexcept:\n    prev = inputs.get('value', {})\ndoubled = prev.get('doubled', [])\nsquared = prev.get('squared', [])\ntotal = prev.get('total', 0)\nanalysis = {\n    'summary': f'Processed {len(doubled)} items',\n    'total_sum': total,\n    'mean': total / len(doubled) if doubled else 0,\n    'max_squared': max(squared) if squared else 0,\n    'min_squared': min(squared) if squared else 0,\n}\nresult = analysis\nprint(json.dumps(result))"
                },
                "input_mapping": {},
            },
            {
                "id": "output-1",
                "type": "output",
                "label": "Analysis Report",
                "position": {"x": 1100, "y": 200},
                "config": {"format": "## Data Analysis Report\n\n{data}"},
                "input_mapping": {},
            },
        ]),
        "edges": json.dumps([
            {"source_node_id": "input-1", "target_node_id": "code-extract"},
            {"source_node_id": "code-extract", "target_node_id": "code-transform"},
            {"source_node_id": "code-transform", "target_node_id": "code-analyze"},
            {"source_node_id": "code-analyze", "target_node_id": "output-1"},
        ]),
    },
]


async def seed_templates(db: AsyncSession):
    result = await db.execute(select(func.count(WorkflowTemplate.id)))
    count = result.scalar()
    if count > 0:
        logger.info("Templates already seeded, count: %d", count)
        return

    for template_data in BUILTIN_TEMPLATES:
        template = WorkflowTemplate(**template_data)
        db.add(template)

    await db.commit()
    logger.info("Seeded %d built-in templates", len(BUILTIN_TEMPLATES))
