"""FastAPI entrypoint for the OR-Tools solver microservice."""

from __future__ import annotations

import logging
from typing import Dict

from fastapi import FastAPI, HTTPException

from models import ErrorResponse, SolverConfig, SolverRequest, SolverResponse
from solver import OrToolsSolver, SolverError

try:  # pragma: no cover - optional runtime metadata
    from ortools import __version__ as ortools_version
except ImportError:  # pragma: no cover - defensive fallback
    ortools_version = "unknown"


logger = logging.getLogger("solver_service")

app = FastAPI(
    title="Generic OR-Tools Solver",
    description="Minimal microservice that exposes CP-SAT solving over HTTP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def startup_event() -> None:
    config = SolverConfig.from_env()
    app.state.config = config
    app.state.solver = OrToolsSolver(config)
    logger.info(
        "Solver service initialised",
        extra={"timeout_seconds": config.max_time_seconds, "num_workers": config.num_workers},
    )


@app.post("/solve", response_model=SolverResponse, responses={400: {"model": ErrorResponse}})
async def solve(request: SolverRequest) -> SolverResponse:
    solver: OrToolsSolver = app.state.solver
    try:
        result = solver.solve(request)
        return result
    except SolverError as exc:
        logger.warning("Solver rejected request", extra={"error": str(exc)})
        raise HTTPException(status_code=400, detail={"error": "invalid_model", "details": str(exc)}) from exc


@app.get("/health")
async def health() -> Dict[str, object]:
    config: SolverConfig = app.state.config
    return {
        "status": "ok",
        "ortools_version": ortools_version,
        "timeout_seconds": config.max_time_seconds,
        "num_workers": config.num_workers,
    }



