"""Pydantic models for the OR-Tools solver microservice."""

from __future__ import annotations

import os
from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


SolverStatus = Literal["OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN"]


class SolverConfig(BaseModel):
    """Runtime configuration loaded from environment variables."""

    max_time_seconds: float = Field(5.0, gt=0.0, description="CP-SAT time limit in seconds")
    num_workers: int = Field(4, ge=1, le=64, description="Number of search workers")

    @classmethod
    def from_env(cls) -> "SolverConfig":
        timeout = float(os.getenv("SOLVER_TIMEOUT_SECONDS", cls.__fields__["max_time_seconds"].default))
        workers = int(os.getenv("SOLVER_NUM_WORKERS", cls.__fields__["num_workers"].default))
        return cls(max_time_seconds=timeout, num_workers=workers)


class IntVarModel(BaseModel):
    id: str
    min: int = Field(default=0)
    max: int

    @field_validator("max")
    @classmethod
    def validate_domain(cls, value: int, info) -> int:
        min_value = info.data.get("min", 0)
        if value < min_value:
            raise ValueError(f"max must be >= min for variable {info.data.get('id')}")
        return value


class BoolVarModel(BaseModel):
    id: str


class LinearTerm(BaseModel):
    var: str
    coefficient: int = 1


class IntervalVarModel(BaseModel):
    id: str
    start_var: str
    duration: int = Field(..., gt=0)
    end_var: Optional[str] = None
    optional: bool = False
    presence_var: Optional[str] = None

    @model_validator(mode="after")
    def validate_presence(self) -> "IntervalVarModel":
        if self.optional:
            # Allow auto-created presence variable if not provided
            return self
        if self.presence_var is not None:
            raise ValueError("presence_var is only valid for optional intervals")
        return self


class ConstraintModel(BaseModel):
    type: Literal["no_overlap", "less_equal", "greater_equal", "equal", "sum_equal", "bool_or"]
    left: Optional[str] = None
    right: Optional[Union[int, str]] = None
    equals: Optional[int] = None
    intervals: Optional[List[str]] = None
    terms: Optional[List[LinearTerm]] = None
    literals: Optional[List[str]] = None
    condition: Optional[str] = None

    @model_validator(mode="after")
    def check_required_fields(self) -> "ConstraintModel":
        constraint_type = self.type
        if constraint_type == "no_overlap" and not self.intervals:
            raise ValueError("no_overlap constraints require 'intervals'")
        if constraint_type in {"less_equal", "greater_equal", "equal"}:
            if self.left is None:
                raise ValueError(f"{constraint_type} constraints require 'left'")
            if self.right is None:
                raise ValueError(f"{constraint_type} constraints require 'right'")
        if constraint_type == "sum_equal":
            if not self.terms:
                raise ValueError("sum_equal constraints require 'terms'")
            if self.equals is None:
                raise ValueError("sum_equal constraints require 'equals'")
        if constraint_type == "bool_or" and not self.literals:
            raise ValueError("bool_or constraints require 'literals'")
        return self


class ObjectiveModel(BaseModel):
    type: Literal["maximize", "minimize"]
    terms: List[LinearTerm]


class SolverRequest(BaseModel):
    variables: List[IntVarModel] = Field(default_factory=list)
    bool_variables: List[BoolVarModel] = Field(default_factory=list)
    intervals: List[IntervalVarModel] = Field(default_factory=list)
    constraints: List[ConstraintModel] = Field(default_factory=list)
    objective: Optional[ObjectiveModel] = None

    @field_validator("bool_variables", mode="before")
    @classmethod
    def normalize_bool_vars(cls, value):
        if value is None:
            return []
        if all(isinstance(item, str) for item in value):
            return [{"id": item} for item in value]
        return value


class VariableValue(BaseModel):
    id: str
    value: int


class BoolValue(BaseModel):
    id: str
    value: bool


class IntervalValue(BaseModel):
    id: str
    start: int
    end: int
    presence: bool


class SolverResponse(BaseModel):
    status: SolverStatus
    objective_value: Optional[int] = None
    wall_time: float
    variables: List[VariableValue] = Field(default_factory=list)
    bool_variables: List[BoolValue] = Field(default_factory=list)
    intervals: List[IntervalValue] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None


