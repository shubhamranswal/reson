from typing import Literal

from mcp.server.mcpserver import MCPServer

from app.incident.engine import IncidentEngine
from app.incident.store import incident_store

server = MCPServer(
    name="reson-incident-commander",
    title="Reson Incident Commander",
    description="Tools for maintaining structured state during technical incidents.",
    version="0.1.0",
)


@server.tool(
    name="record_incident_event",
    description=(
        "Record structured information from an active technical incident. "
        "Use 'fact' for confirmed information, 'hypothesis' for possible "
        "explanations that are not confirmed, and 'action' for tasks assigned "
        "to incident responders."
    ),
)
def record_incident_event(
    type: Literal["fact", "hypothesis", "action"],
    text: str,
    owner: str | None = None,
) -> dict:
    """Record an incident fact, hypothesis, or action."""

    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    if type == "fact":
        result = engine.add_fact(text)

    elif type == "hypothesis":
        result = engine.add_hypothesis(text)

    else:
        result = engine.add_action(
            description=text,
            owner=owner,
        )

    print(f"[MCP] Recorded incident event: type={type}, id={result.id}, text={text}")

    return result.model_dump(mode="json")


@server.tool(
    name="get_incident_state",
    description=(
        "Get the current structured state of the active technical incident, "
        "including confirmed facts, hypotheses, decisions, pending actions, "
        "timeline events, and conflicts."
    ),
)
def get_incident_state() -> dict:
    """Return the current incident state."""
    state = incident_store.get_active_incident()
    return state.model_dump(mode="json")


@server.tool(
    name="record_incident_conflict",
    description=(
        "Record a detected contradiction between existing incident evidence. "
        "Use this tool when two incident facts or hypotheses contain materially "
        "inconsistent information. Do NOT record the contradiction itself as a "
        "fact. Do NOT overwrite either piece of evidence. Preserve both and "
        "create a conflict linking their IDs."
    ),
)
def record_incident_conflict(
    description: str,
    related_fact_ids: list[str] | None = None,
    related_hypothesis_ids: list[str] | None = None,
) -> dict:
    """Record a conflict in the active incident."""
    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    conflict = engine.add_conflict(
        description=description,
        related_fact_ids=related_fact_ids,
        related_hypothesis_ids=related_hypothesis_ids,
    )

    return conflict.model_dump(mode="json")


@server.tool(
    name="resolve_incident_conflict",
    description=(
        "Mark an existing incident conflict as resolved. "
        "Use this when the responder explicitly asks to resolve, close, "
        "dismiss, or mark an existing conflict as resolved. "
        "Resolving a conflict does not delete or invalidate the underlying "
        "evidence. Preserve the original facts and hypotheses."
    ),
)
def resolve_incident_conflict(
    conflict_id: str,
) -> dict:
    """Mark an existing incident conflict as resolved."""

    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    conflict = engine.resolve_conflict(conflict_id)

    return conflict.model_dump(mode="json")


@server.tool(
    name="resolve_incident",
    description=(
        "Mark the active incident as resolved. "
        "Use this only when the responder explicitly asks to mark, close, "
        "or resolve the incident. "
        "If the responder specifies prerequisite actions or an execution "
        "order, complete those prerequisites first."
        "Provide a concise reason or resolution summary when the responder "
        "has supplied one. If no reason is available, the incident may still "
        "be resolved when the responder explicitly requests it."
    ),
)
def resolve_incident(reason: str | None = None) -> dict:
    """Mark the active incident as resolved."""

    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    resolved_state = engine.resolve_incident(reason=reason)

    return resolved_state.model_dump(mode="json")

@server.tool(
    name="record_incident_decision",
    description=(
        "Record a decision explicitly made by the incident responder or "
        "incident team. Use this when the responder states that the team "
        "has decided, agreed, chosen, approved, or committed to a course "
        "of action. Do not use this for facts, hypotheses, or ordinary "
        "acknowledgements."
    ),
)
def record_incident_decision(
    text: str,
    decided_by: str | None = None,
) -> dict:
    """Record an incident decision."""

    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    decision = engine.add_decision(
        text=text,
        decided_by=decided_by,
    )

    return decision.model_dump(mode="json")

@server.tool(
    name="support_incident_hypothesis",
    description=(
        "Mark an existing incident hypothesis as supported when available "
        "evidence provides meaningful support for it. Use this when an "
        "investigation strengthens a hypothesis but does not necessarily "
        "establish it as a confirmed fact."
    ),
)
def support_incident_hypothesis(hypothesis_id: str) -> dict:
    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    hypothesis = engine.support_hypothesis(hypothesis_id)

    return hypothesis.model_dump(mode="json")


@server.tool(
    name="contradict_incident_hypothesis",
    description=(
        "Mark an existing incident hypothesis as contradicted when incident "
        "evidence demonstrates that the hypothesis is not supported or is "
        "inconsistent with the observed evidence. Preserve the hypothesis "
        "in incident history."
    ),
)
def contradict_incident_hypothesis(hypothesis_id: str) -> dict:
    state = incident_store.get_active_incident()
    engine = IncidentEngine(state)

    hypothesis = engine.contradict_hypothesis(hypothesis_id)

    return hypothesis.model_dump(mode="json")


@server.tool(
    name="create_incident",
    description=(
        "Create a new technical incident and make it the active incident. "
        "Use this when a new independent incident needs to be tracked. "
        "Provide a concise incident title, severity, and optionally who "
        "opened the incident."
    ),
)
def create_incident(
    title: str,
    severity: Literal["SEV-1", "SEV-2", "SEV-3"],
    opened_by: str | None = None,
) -> dict:
    incident = incident_store.create_incident(
        title=title,
        severity=severity,
        opened_by=opened_by,
    )

    return incident.model_dump(mode="json")

@server.tool(
    name="list_incidents",
    description=(
        "List all incidents currently tracked by Reson. "
        "Use this when the responder wants to see available incidents "
        "or identify an incident to switch to."
    ),
)
def list_incidents() -> list[dict]:
    return [
        incident.model_dump(mode="json")
        for incident in incident_store.list_incidents()
    ]


@server.tool(
    name="switch_incident",
    description=(
        "Switch the active incident context to an existing incident. "
        "After switching, all incident investigation tools operate on "
        "the selected incident. Use the incident ID returned by "
        "list_incidents or create_incident."
    ),
)
def switch_incident(incident_id: str) -> dict:
    incident = incident_store.switch_incident(incident_id)
    return incident.model_dump(mode="json")

