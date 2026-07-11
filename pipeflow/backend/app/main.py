from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import async_session, init_db
from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware, global_exception_handler, validation_error_handler
from app.services.template_service import seed_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await init_db()

    async with async_session() as db:
        await seed_templates(db)

    yield


app = FastAPI(
    title="PipeFlow",
    description="Visual AI Pipeline Orchestration Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, global_exception_handler)

from app.routers.auth import router as auth_router
from app.routers.workflows import router as workflows_router
from app.routers.templates import router as templates_router
from app.routers.published import router as published_router

app.include_router(auth_router)
app.include_router(workflows_router)
app.include_router(templates_router)
app.include_router(published_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "pipeflow"}
