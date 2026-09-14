import asyncio
import json
import os
import requests

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


BASE_URL = "<backend_url>"
MCP_URL = f"{BASE_URL}/mcp"


DEMO_INCIDENTS = [
    {
        "title": "Checkout API Degradation",
        "severity": "SEV-1",
        "opened_by": "demo-seed",
        "facts": [
            "Checkout API error rate increased to 31% over the last 10 minutes.",
            "Checkout failures began approximately 8 minutes after the latest checkout-service deployment.",
            "Redis command latency increased significantly during the same window.",
            "Checkout request volume remains within the normal range.",
            "Rolling back the latest checkout-service deployment reduced the error rate.",
        ],
        "hypotheses": [
            "The latest checkout-service deployment introduced a regression.",
            "Elevated Redis latency is contributing to checkout request failures.",
        ],
        "actions": [
            {
                "text": "Compare checkout error rates immediately before and after the latest deployment.",
                "owner": "Payments Team",
            },
            {
                "text": "Inspect Redis command latency, timeout, and connection metrics.",
                "owner": "Platform Team",
            },
            {
                "text": "Verify checkout error rates remain stable after rollback.",
                "owner": "SRE",
            },
        ],
        "decision": {
            "text": "Keep the checkout-service rollback in place while the deployment and Redis signals are investigated.",
            "decided_by": "Incident Team",
        },
        "conflicts": [
            {
                "description": (
                    "Checkout request volume is normal, but checkout failures "
                    "have increased sharply, indicating the degradation is not "
                    "explained by increased traffic alone."
                ),
                "fact_indexes": [2, 3],
            },
            {
                "description": (
                    "Redis health checks remain nominal while Redis command "
                    "latency is significantly elevated."
                ),
                "fact_indexes": [2, 4],
            },
        ],
    },
    {
        "title": "Authentication Failure Spike",
        "severity": "SEV-1",
        "opened_by": "demo-seed",
        "facts": [
            "Authentication failures increased to 24% of login attempts.",
            "The failures began approximately 12 minutes after the latest web authentication deployment.",
            "The identity provider currently reports healthy availability.",
            "Application token-validation failures increased sharply during the incident.",
            "Existing authenticated sessions remain mostly unaffected while new logins fail.",
        ],
        "hypotheses": [
            "The latest web deployment introduced an authentication configuration or token-validation regression.",
            "The identity provider is contributing to the authentication failures despite reporting healthy availability.",
        ],
        "actions": [
            {
                "text": "Compare authentication configuration between the previous and current web deployment.",
                "owner": "Web Platform",
            },
            {
                "text": "Inspect token issuance and token-validation failures separately.",
                "owner": "Identity Team",
            },
            {
                "text": "Verify authentication behaviour against the identity provider independently of the web application.",
                "owner": "SRE",
            },
        ],
        "decision": {
            "text": "Investigate the web deployment and token-validation path before escalating the incident to the identity provider.",
            "decided_by": "Incident Team",
        },
        "conflicts": [
            {
                "description": (
                    "The identity provider reports healthy availability, "
                    "while the application is experiencing a sharp increase "
                    "in authentication failures."
                ),
                "fact_indexes": [2, 3],
            },
            {
                "description": (
                    "Existing authenticated sessions remain healthy while "
                    "new authentication attempts fail, suggesting the failure "
                    "may be isolated to the login or token-validation path."
                ),
                "fact_indexes": [0, 4],
            },
        ],
    },
    {
        "title": "Order Processing Backlog",
        "severity": "SEV-2",
        "opened_by": "demo-seed",
        "facts": [
            "The order-processing queue increased from approximately 2,000 messages to 48,000 messages.",
            "Order-processing workers are consistently above 90% CPU utilization.",
            "Incoming order traffic remains within the normal range.",
            "Order-processing latency has increased significantly.",
            "No database availability alerts have fired during the backlog growth.",
        ],
        "hypotheses": [
            "Order-processing workers do not currently have sufficient processing capacity.",
            "A recent worker deployment reduced order-processing throughput.",
        ],
        "actions": [
            {
                "text": "Compare worker throughput before and after the latest deployment.",
                "owner": "Backend Team",
            },
            {
                "text": "Inspect worker CPU utilization and processing latency.",
                "owner": "SRE",
            },
            {
                "text": "Test scaling the order-processing worker pool and observe queue recovery.",
                "owner": "Platform Team",
            },
        ],
        "decision": {
            "text": "Scale the worker pool while investigating whether the recent worker deployment reduced throughput.",
            "decided_by": "Incident Team",
        },
        "conflicts": [
            {
                "description": (
                    "Incoming order traffic is normal, but the processing "
                    "queue is growing rapidly while workers are CPU saturated."
                ),
                "fact_indexes": [0, 1, 2],
            },
        ],
    },
]



def parse_tool_result(result):
    """
    Normalize MCP CallToolResult into the actual tool return value.
    Supports both structuredContent and text content responses.
    """

    if getattr(result, "isError", False):
        raise RuntimeError(f"MCP tool returned an error: {result}")

    # FastMCP / MCP structured response
    structured = getattr(result, "structuredContent", None)

    if structured is not None:
        # Depending on the MCP server/client version, the actual
        # return value may be stored under "result".
        if isinstance(structured, dict) and "result" in structured:
            return structured["result"]

        return structured

    # Fallback to normal content[]
    content = getattr(result, "content", [])

    if not content:
        return None

    first = content[0]

    text = getattr(first, "text", None)

    if text is not None:
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return text

    return first

async def call_tool(session, name, arguments=None):
    arguments = arguments or {}

    print(f"  → {name}")

    result = await session.call_tool(
        name,
        arguments=arguments,
    )

    return parse_tool_result(result)


def get_incidents():
    response = requests.get(
        f"{BASE_URL}/api/incidents",
        timeout=30,
    )

    response.raise_for_status()

    return response.json()


def find_incident(title):
    incidents = get_incidents()

    for incident in incidents:
        if incident.get("title") == title:
            return incident

    return None


async def seed_incident(session, demo):
    print()
    print("=" * 70)
    print(f"🚨 {demo['title']} [{demo['severity']}]")
    print("=" * 70)

    existing = find_incident(demo["title"])

    if existing:
        print(f"✓ Already exists: {existing['id']}")

        await call_tool(
            session,
            "switch_incident",
            {
                "incident_id": existing["id"],
            },
        )

        state = await call_tool(
            session,
            "get_incident_state",
        )

        if state.get("facts"):
            print("✓ Incident already contains state. Skipping seed.")
            return existing["id"]

        incident_id = existing["id"]

    else:
        response = requests.post(
            f"{BASE_URL}/api/incidents",
            json={
                "title": demo["title"],
                "severity": demo["severity"],
                "opened_by": demo["opened_by"],
            },
            timeout=30,
        )

        response.raise_for_status()

        incident = response.json()
        incident_id = incident["id"]

        print(f"✓ Created {incident_id}")

        await call_tool(
            session,
            "switch_incident",
            {
                "incident_id": incident_id,
            },
        )   # ------------------------------------------------------------------
        # Facts
        # ------------------------------------------------------------------

        facts = []

        print()
        print("📌 Facts")

        for text in demo["facts"]:
            fact = await call_tool(
                session,
                "record_incident_event",
                {
                    "type": "fact",
                    "text": text,
                },
            )

            facts.append(fact)

        print(f"✓ Added {len(facts)} facts")

        # ------------------------------------------------------------------
        # Hypotheses
        # ------------------------------------------------------------------

        hypotheses = []

        print()
        print("🔎 Hypotheses")

        for text in demo["hypotheses"]:
            hypothesis = await call_tool(
                session,
                "record_incident_event",
                {
                    "type": "hypothesis",
                    "text": text,
                },
            )

            hypotheses.append(hypothesis)

        print(f"✓ Added {len(hypotheses)} hypotheses")

        # ------------------------------------------------------------------
        # Actions
        # ------------------------------------------------------------------

        print()
        print("🛠 Actions")

        for action in demo["actions"]:
            await call_tool(
                session,
                "record_incident_event",
                {
                    "type": "action",
                    "text": action["text"],
                    "owner": action["owner"],
                },
            )

        print(f"✓ Added {len(demo['actions'])} actions")

        # ------------------------------------------------------------------
        # Decision
        # ------------------------------------------------------------------

        print()
        print("🧭 Decision")

        await call_tool(
            session,
            "record_incident_decision",
            {
                "text": demo["decision"]["text"],
                "decided_by": demo["decision"]["decided_by"],
            },
        )

        print("✓ Added decision")

        # ------------------------------------------------------------------
        # Conflicts
        # ------------------------------------------------------------------

        print()
        print("⚠️ Conflicts")

        for conflict in demo["conflicts"]:
            related_fact_ids = [
                facts[index]["id"]
                for index in conflict.get("fact_indexes", [])
            ]

            related_hypothesis_ids = [
                hypotheses[index]["id"]
                for index in conflict.get("hypothesis_indexes", [])
            ]

            await call_tool(
                session,
                "record_incident_conflict",
                {
                    "description": conflict["description"],
                    "related_fact_ids": related_fact_ids,
                    "related_hypothesis_ids": related_hypothesis_ids,
                },
            )

        print(f"✓ Added {len(demo['conflicts'])} conflicts")

        # ------------------------------------------------------------------
        # Verification
        # ------------------------------------------------------------------

        state = await call_tool(
            session,
            "get_incident_state",
        )

        print()
        print("📊 Seeded state")
        print(f"   Incident:    {state['id']}")
        print(f"   Status:      {state['status']}")
        print(f"   Facts:       {len(state.get('facts', []))}")
        print(f"   Hypotheses:  {len(state.get('hypotheses', []))}")
        print(f"   Actions:     {len(state.get('actions', []))}")
        print(f"   Decisions:   {len(state.get('decisions', []))}")
        print(f"   Conflicts:   {len(state.get('conflicts', []))}")
        print(f"   Timeline:    {len(state.get('timeline', []))}")

        return incident_id


async def main():
    print()
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║                     RESON DEMO SEED                                ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print()
    print(f"MCP: {MCP_URL}")

    async with streamable_http_client(MCP_URL) as (
        read_stream,
        write_stream,
    ):
        async with ClientSession(
            read_stream,
            write_stream,
        ) as session:

            await session.initialize()

            print("✓ Connected to Reson MCP")
            print()

            created_ids = []

            for demo in DEMO_INCIDENTS:
                incident_id = await seed_incident(
                    session,
                    demo,
                )

                created_ids.append(incident_id)

            # ----------------------------------------------------------
            # Leave the first demo incident active.
            # ----------------------------------------------------------

            demo_incident_id = created_ids[0]

            await call_tool(
                session,
                "switch_incident",
                {
                    "incident_id": demo_incident_id,
                },
            )

            print()
            print("=" * 70)
            print("🎬 DEMO READY")
            print("=" * 70)

            incidents = get_incidents()

            for incident in incidents:
                if incident["id"] in created_ids:
                    print(
                        f"  {incident['id']}  "
                        f"{incident['severity']}  "
                        f"{incident['title']}"
                    )

            print()
            print(f"🔥 Active incident: {demo_incident_id}")
            print("   Open Reson and start talking.")
            print()


if __name__ == "__main__":
    asyncio.run(main())