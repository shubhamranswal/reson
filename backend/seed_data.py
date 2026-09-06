import requests


BASE_URL = "http://127.0.0.1:8000"


def create_incident(title: str, severity: str, opened_by: str):
    response = requests.post(
        f"{BASE_URL}/api/incidents",
        json={
            "title": title,
            "severity": severity,
            "opened_by": opened_by,
        },
    )

    response.raise_for_status()
    incident = response.json()

    print(
        f"✅ Created {incident['id']}: "
        f"{incident['title']} [{incident['severity']}]"
    )

    return incident


def add_event(
    incident_id: str,
    event_type: str,
    text: str,
    owner: str | None = None,
):
    # Switch to the incident first.
    response = requests.post(
        f"{BASE_URL}/api/incidents/switch",
        json={"incident_id": incident_id},
    )
    response.raise_for_status()

    payload = {
        "type": event_type,
        "text": text,
    }

    if owner:
        payload["owner"] = owner

    response = requests.post(
        f"{BASE_URL}/api/incidents/events",
        json=payload,
    )
    response.raise_for_status()

    print(
        f"   └─ Added {event_type}: {text}"
    )


def add_incident_data(
    incident_id: str,
    facts: list[str],
    hypotheses: list[str],
    actions: list[tuple[str, str | None]],
):
    for fact in facts:
        add_event(
            incident_id,
            "fact",
            fact,
        )

    for hypothesis in hypotheses:
        add_event(
            incident_id,
            "hypothesis",
            hypothesis,
        )

    for description, owner in actions:
        add_event(
            incident_id,
            "action",
            description,
            owner,
        )


def list_incidents():
    response = requests.get(
        f"{BASE_URL}/api/incidents",
    )
    response.raise_for_status()

    incidents = response.json()

    print("\n" + "=" * 70)
    print("ALL INCIDENTS")
    print("=" * 70)

    for incident in incidents:
        print(
            f"{incident['id']} | "
            f"{incident['severity']} | "
            f"{incident['status']} | "
            f"{incident['title']} | "
            f"opened by {incident.get('opened_by')}"
        )

    print("=" * 70)

    return incidents


def switch_incident(incident_id: str):
    response = requests.post(
        f"{BASE_URL}/api/incidents/switch",
        json={"incident_id": incident_id},
    )
    response.raise_for_status()

    incident = response.json()

    print(
        f"\n🎯 Active incident: "
        f"{incident['id']} - {incident['title']}"
    )

    return incident


def main():
    print("\n🚨 Seeding incidents through FastAPI...\n")

    # ---------------------------------------------------------------
    # INC-002
    # ---------------------------------------------------------------

    auth = create_incident(
        title="Authentication Service Failure",
        severity="SEV-1",
        opened_by="Alice",
    )

    add_incident_data(
        auth["id"],
        facts=[
            "Authentication success rate dropped below 40%.",
            "Multiple login requests are returning HTTP 500.",
            "The issue started shortly after the latest authentication deployment.",
        ],
        hypotheses=[
            "The latest authentication deployment may be causing the failures.",
            "The authentication database connection pool may be exhausted.",
        ],
        actions=[
            ("Inspect authentication service logs.", "Rahul"),
            ("Compare error rates before and after the deployment.", "Alice"),
        ],
    )

    # ---------------------------------------------------------------
    # INC-003
    # ---------------------------------------------------------------

    orders = create_incident(
        title="Order Processing Delays",
        severity="SEV-2",
        opened_by="Rahul",
    )

    add_incident_data(
        orders["id"],
        facts=[
            "Order processing latency has increased above 30 seconds.",
            "The order queue contains more than 50,000 pending messages.",
        ],
        hypotheses=[
            "The order worker fleet may be under-provisioned.",
            "The message queue consumer may be experiencing failures.",
        ],
        actions=[
            ("Inspect order worker CPU and memory usage.", "Shubham"),
            ("Check message queue consumer error logs.", "Rahul"),
        ],
    )

    # ---------------------------------------------------------------
    # INC-004
    # ---------------------------------------------------------------

    payments = create_incident(
        title="Payment Provider Degradation",
        severity="SEV-3",
        opened_by="Shubham",
    )

    add_incident_data(
        payments["id"],
        facts=[
            "Payment authorization latency has increased significantly.",
            "The payment provider is returning elevated timeout responses.",
        ],
        hypotheses=[
            "The external payment provider may be experiencing degradation.",
        ],
        actions=[
            ("Check payment provider status and latency metrics.", "Shubham"),
        ],
    )

    # ---------------------------------------------------------------
    # Verify
    # ---------------------------------------------------------------

    incidents = list_incidents()

    # Switch around a few times to prove the API/store works.
    for incident in incidents:
        switch_incident(incident["id"])

    print("\n✅ Seed complete.")
    print(f"Total incidents: {len(incidents)}")


if __name__ == "__main__":
    main()