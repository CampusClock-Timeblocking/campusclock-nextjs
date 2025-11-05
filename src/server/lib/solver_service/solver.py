"""OR-Tools CP-SAT wrapper for the solver microservice."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple, Union

from ortools.sat.python import cp_model

from models import (
    BoolValue,
    BoolVarModel,
    ConstraintModel,
    IntVarModel,
    IntervalValue,
    IntervalVarModel,
    LinearTerm,
    ObjectiveModel,
    SolverConfig,
    SolverRequest,
    SolverResponse,
    SolverStatus,
    VariableValue,
)


NEGATION_PREFIX = "!"
DEFAULT_MIN = -10**9
DEFAULT_MAX = 10**9


class SolverError(Exception):
    """Exception raised when the solver cannot build or solve a model."""


class OrToolsSolver:
    """Encapsulates CP-SAT model construction and solving."""

    def __init__(self, config: SolverConfig):
        self._config = config

    def solve(self, request: SolverRequest) -> SolverResponse:
        model = cp_model.CpModel()

        int_vars: Dict[str, cp_model.IntVar] = {}
        bool_vars: Dict[str, cp_model.BoolVar] = {}
        interval_vars: Dict[str, Tuple[cp_model.IntervalVar, Optional[cp_model.BoolVar]]] = {}

        try:
            self._build_int_variables(model, request.variables, int_vars)
            self._build_bool_variables(model, request.bool_variables, bool_vars)
            self._build_intervals(model, request.intervals, int_vars, bool_vars, interval_vars)
            self._apply_constraints(model, request.constraints, int_vars, bool_vars, interval_vars)
            self._configure_objective(model, request.objective, int_vars, bool_vars)

            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = self._config.max_time_seconds
            solver.parameters.num_search_workers = self._config.num_workers

            status_code = solver.Solve(model)
            status = self._map_status(status_code)

            return self._build_response(status, solver, request, int_vars, bool_vars, interval_vars)
        except SolverError:
            raise
        except Exception as exc:  # pragma: no cover - defensive programming
            raise SolverError(str(exc)) from exc

    def _build_int_variables(
        self,
        model: cp_model.CpModel,
        variables: List[IntVarModel],
        int_vars: Dict[str, cp_model.IntVar],
    ) -> None:
        for var in variables:
            if var.id in int_vars:
                raise SolverError(f"Duplicate integer variable id '{var.id}'")
            int_vars[var.id] = model.NewIntVar(var.min, var.max, var.id)

    def _build_bool_variables(
        self,
        model: cp_model.CpModel,
        bool_variables: List[BoolVarModel],
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> None:
        for var in bool_variables:
            if var.id in bool_vars:
                raise SolverError(f"Duplicate boolean variable id '{var.id}'")
            bool_vars[var.id] = model.NewBoolVar(var.id)

    def _build_intervals(
        self,
        model: cp_model.CpModel,
        intervals: List[IntervalVarModel],
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        interval_vars: Dict[str, Tuple[cp_model.IntervalVar, Optional[cp_model.BoolVar]]],
    ) -> None:
        for interval in intervals:
            start_var = self._require_int_var(model, interval.start_var, int_vars)

            end_var_id = interval.end_var or f"{interval.id}_end"
            end_var = self._ensure_int_var(model, end_var_id, int_vars, interval.duration, DEFAULT_MAX)

            if interval.optional:
                presence = self._ensure_bool_var(model, interval.presence_var or f"{interval.id}_presence", bool_vars)
                interval_var = model.NewOptionalIntervalVar(
                    start_var, interval.duration, end_var, presence, interval.id
                )
                model.Add(end_var == start_var + interval.duration).OnlyEnforceIf(presence)
            else:
                if interval.presence_var:
                    raise SolverError(f"Interval '{interval.id}' is not optional but presence_var was provided")
                interval_var = model.NewIntervalVar(start_var, interval.duration, end_var, interval.id)
                model.Add(end_var == start_var + interval.duration)
                presence = None

            interval_vars[interval.id] = (interval_var, presence)

    def _apply_constraints(
        self,
        model: cp_model.CpModel,
        constraints: List[ConstraintModel],
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        interval_vars: Dict[str, Tuple[cp_model.IntervalVar, Optional[cp_model.BoolVar]]],
    ) -> None:
        for constraint in constraints:
            condition_literals = self._parse_condition(constraint.condition, bool_vars)

            if constraint.type == "no_overlap":
                self._constraint_no_overlap(model, constraint, interval_vars)
            elif constraint.type in {"less_equal", "greater_equal", "equal"}:
                self._constraint_comparison(model, constraint, int_vars, bool_vars, condition_literals)
            elif constraint.type == "sum_equal":
                self._constraint_sum_equal(model, constraint, int_vars, bool_vars, condition_literals)
            elif constraint.type == "bool_or":
                self._constraint_bool_or(model, constraint, bool_vars, condition_literals)
            else:  # pragma: no cover - exhaustive guard
                raise SolverError(f"Unsupported constraint type '{constraint.type}'")

    def _configure_objective(
        self,
        model: cp_model.CpModel,
        objective: Optional[ObjectiveModel],
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> None:
        if not objective:
            return

        expr = None
        for term in objective.terms:
            var = self._get_linear_term_var(term.var, int_vars, bool_vars)
            term_expr = term.coefficient * var
            expr = term_expr if expr is None else expr + term_expr

        if expr is None:
            raise SolverError("Objective must contain at least one term")

        if objective.type == "maximize":
            model.Maximize(expr)
        else:
            model.Minimize(expr)

    def _build_response(
        self,
        status: SolverStatus,
        solver: cp_model.CpSolver,
        request: SolverRequest,
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        interval_vars: Dict[str, Tuple[cp_model.IntervalVar, Optional[cp_model.BoolVar]]],
    ) -> SolverResponse:
        if status in ("OPTIMAL", "FEASIBLE"):
            variables = [
                VariableValue(id=var_id, value=solver.Value(var))
                for var_id, var in sorted(int_vars.items())
            ]
            bools = [
                BoolValue(id=var_id, value=bool(solver.Value(var)))
                for var_id, var in sorted(bool_vars.items())
            ]
            intervals = []
            for interval_id, (interval_var, presence_var) in interval_vars.items():
                present = True
                if presence_var is not None:
                    present = bool(solver.Value(presence_var))
                start = solver.Value(interval_var.StartExpr()) if present else 0
                end = solver.Value(interval_var.EndExpr()) if present else 0
                intervals.append(
                    IntervalValue(id=interval_id, start=start, end=end, presence=present)
                )
            objective_value = (
                int(solver.ObjectiveValue())
                if request.objective and status in ("OPTIMAL", "FEASIBLE")
                else None
            )
        else:
            variables = []
            bools = []
            intervals = []
            objective_value = None

        return SolverResponse(
            status=status,
            objective_value=objective_value,
            wall_time=solver.WallTime(),
            variables=variables,
            bool_variables=bools,
            intervals=intervals,
        )

    def _constraint_no_overlap(
        self,
        model: cp_model.CpModel,
        constraint: ConstraintModel,
        interval_vars: Dict[str, Tuple[cp_model.IntervalVar, Optional[cp_model.BoolVar]]],
    ) -> None:
        try:
            model.AddNoOverlap([interval_vars[i][0] for i in constraint.intervals or []])
        except KeyError as exc:
            raise SolverError(f"Interval '{exc.args[0]}' referenced before definition") from exc

    def _constraint_comparison(
        self,
        model: cp_model.CpModel,
        constraint: ConstraintModel,
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        condition_literals: List[cp_model.BoolVar],
    ) -> None:
        left = self._resolve_linear_operand(constraint.left, int_vars, bool_vars)
        right = self._resolve_linear_operand(constraint.right, int_vars, bool_vars)

        if constraint.type == "less_equal":
            ct = model.Add(left <= right)
        elif constraint.type == "greater_equal":
            ct = model.Add(left >= right)
        else:
            ct = model.Add(left == right)

        for literal in condition_literals:
            ct.OnlyEnforceIf(literal)

    def _constraint_sum_equal(
        self,
        model: cp_model.CpModel,
        constraint: ConstraintModel,
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        condition_literals: List[cp_model.BoolVar],
    ) -> None:
        expr = sum(
            (term.coefficient or 1)
            * self._get_linear_term_var(term.var, int_vars, bool_vars)
            for term in constraint.terms or []
        )
        ct = model.Add(expr == int(constraint.equals))
        for literal in condition_literals:
            ct.OnlyEnforceIf(literal)

    def _constraint_bool_or(
        self,
        model: cp_model.CpModel,
        constraint: ConstraintModel,
        bool_vars: Dict[str, cp_model.BoolVar],
        condition_literals: List[cp_model.BoolVar],
    ) -> None:
        literals = [self._parse_literal(lit, bool_vars) for lit in constraint.literals or []]
        ct = model.AddBoolOr(literals)
        for literal in condition_literals:
            ct.OnlyEnforceIf(literal)

    def _parse_condition(
        self,
        condition: Optional[str],
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> List[cp_model.BoolVar]:
        if not condition:
            return []
        literal = self._parse_literal(condition, bool_vars)
        return [literal]

    def _parse_literal(
        self,
        literal: str,
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> cp_model.BoolVar:
        is_negated = literal.startswith(NEGATION_PREFIX)
        var_id = literal[1:] if is_negated else literal
        if var_id not in bool_vars:
            raise SolverError(f"Boolean variable '{var_id}' referenced before definition")
        return bool_vars[var_id].Not() if is_negated else bool_vars[var_id]

    def _resolve_linear_operand(
        self,
        operand: Union[str, int, None],
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
        model: Optional[cp_model.CpModel] = None,
    ) -> Union[cp_model.LinearExpr, int]:
        if operand is None:
            raise SolverError("Constraint operand cannot be None")
        if isinstance(operand, int):
            return operand
        try:
            return int(operand)
        except (TypeError, ValueError):
            if operand in int_vars:
                return int_vars[operand]
            if operand in bool_vars:
                return bool_vars[operand]
            if model is not None:
                return self._ensure_int_var(model, operand, int_vars, DEFAULT_MIN, DEFAULT_MAX)
            raise SolverError(f"Variable '{operand}' referenced before definition")

    def _require_int_var(
        self,
        model: Optional[cp_model.CpModel],
        var_id: str,
        int_vars: Dict[str, cp_model.IntVar],
    ) -> cp_model.IntVar:
        if var_id not in int_vars:
            if model is None:
                raise SolverError(f"Integer variable '{var_id}' referenced before definition")
            int_vars[var_id] = model.NewIntVar(DEFAULT_MIN, DEFAULT_MAX, var_id)
        return int_vars[var_id]

    def _ensure_int_var(
        self,
        model: cp_model.CpModel,
        var_id: str,
        int_vars: Dict[str, cp_model.IntVar],
        min_value: int,
        max_value: int,
    ) -> cp_model.IntVar:
        if var_id in int_vars:
            return int_vars[var_id]
        int_vars[var_id] = model.NewIntVar(min_value, max_value, var_id)
        return int_vars[var_id]

    def _ensure_bool_var(
        self,
        model: cp_model.CpModel,
        var_id: str,
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> cp_model.BoolVar:
        if var_id in bool_vars:
            return bool_vars[var_id]
        bool_vars[var_id] = model.NewBoolVar(var_id)
        return bool_vars[var_id]

    def _get_linear_term_var(
        self,
        var_id: str,
        int_vars: Dict[str, cp_model.IntVar],
        bool_vars: Dict[str, cp_model.BoolVar],
    ) -> Union[cp_model.IntVar, cp_model.BoolVar]:
        if var_id in int_vars:
            return int_vars[var_id]
        if var_id in bool_vars:
            return bool_vars[var_id]
        raise SolverError(f"Variable '{var_id}' used in expression before definition")

    @staticmethod
    def _map_status(status_code: int) -> SolverStatus:
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "UNKNOWN",
            cp_model.UNKNOWN: "UNKNOWN",
        }
        return status_map.get(status_code, "UNKNOWN")


