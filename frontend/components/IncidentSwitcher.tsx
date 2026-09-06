'use client';

import { useEffect, useRef, useState } from 'react';

type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3';

type Incident = {
    id: string;
    title: string;
    severity: Severity;
    status: string;
    opened_by?: string | null;
};

type IncidentSwitcherProps = {
    onIncidentSwitched?: (incident: Incident) => void;
};

const API_URL =
    process.env.NEXT_PUBLIC_RESON_API_URL ?? 'http://127.0.0.1:8000';

const severityStyles: Record<Severity, string> = {
    'SEV-1': 'bg-red-500/10 text-red-600 border-red-500/20',
    'SEV-2': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'SEV-3': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
};

export default function IncidentSwitcher({
    onIncidentSwitched,
}: IncidentSwitcherProps) {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadIncidents = async () => {
            try {
                const [incidentsResponse, currentResponse] = await Promise.all([
                    fetch(`${API_URL}/api/incidents`),
                    fetch(`${API_URL}/api/incidents/current`),
                ]);

                if (!incidentsResponse.ok) {
                    throw new Error('Failed to fetch incidents');
                }

                if (!currentResponse.ok) {
                    throw new Error('Failed to fetch active incident');
                }

                const incidentData = (await incidentsResponse.json()) as Incident[];
                const currentData = (await currentResponse.json()) as Incident;

                setIncidents(incidentData);
                setActiveIncident(currentData);

                onIncidentSwitched?.(currentData);
            } catch (error) {
                console.error('[IncidentSwitcher] Failed to load incidents:', error);
            }
        };

        loadIncidents();
    }, [onIncidentSwitched]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const switchIncident = async (incidentId: string) => {
        if (incidentId === activeIncident?.id) {
            setOpen(false);
            return;
        }

        setSwitching(incidentId);

        try {
            console.log(
                '[IncidentSwitcher] requesting switch:',
                incidentId,
            );

            const switchResponse = await fetch(
                `${API_URL}/api/incidents/switch`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        incident_id: incidentId,
                    }),
                    cache: 'no-store',
                },
            );

            if (!switchResponse.ok) {
                throw new Error(
                    `Failed to switch incident: ${switchResponse.status}`,
                );
            }

            const switchedIncident =
                (await switchResponse.json()) as Incident;

            console.log(
                '[IncidentSwitcher] switch response:',
                switchedIncident,
            );

            // IMPORTANT:
            // Ask the backend what it considers active AFTER the switch.
            const currentResponse = await fetch(
                `${API_URL}/api/incidents/current`,
                {
                    cache: 'no-store',
                },
            );

            if (!currentResponse.ok) {
                throw new Error(
                    `Failed to verify active incident: ${currentResponse.status}`,
                );
            }

            const currentIncident =
                (await currentResponse.json()) as Incident;

            console.log(
                '[IncidentSwitcher] verified backend active incident:',
                currentIncident,
            );

            if (currentIncident.id !== incidentId) {
                throw new Error(
                    `Incident switch mismatch. Requested ${incidentId}, ` +
                    `but backend reports ${currentIncident.id}.`,
                );
            }

            // Only update UI after backend verification succeeds.
            setActiveIncident(currentIncident);
            setOpen(false);

            onIncidentSwitched?.(currentIncident);
        } catch (error) {
            console.error(
                '[IncidentSwitcher] Failed to switch incident:',
                error,
            );
        } finally {
            setSwitching(null);
        }
    };

    const severityCounts = incidents.reduce(
        (counts, incident) => {
            counts[incident.severity] =
                (counts[incident.severity] ?? 0) + 1;

            return counts;
        },
        {} as Partial<Record<Severity, number>>,
    );

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-left shadow-sm transition-colors hover:bg-muted"
            >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                    S
                </div>

                <div className="hidden leading-none sm:block">
                    <div className="text-[11px] font-medium text-foreground">
                        Shubham
                    </div>

                    <div className="mt-1 text-[9px] text-muted-foreground">
                        {incidents.length} incidents
                    </div>
                </div>

                {activeIncident && (
                    <span
                        className={`hidden rounded-full border px-1.5 py-0.5 text-[8px] font-semibold sm:inline-flex ${severityStyles[activeIncident.severity]
                            }`}
                    >
                        {activeIncident.severity}
                    </span>
                )}

                <span
                    className={`ml-0.5 text-[10px] text-muted-foreground transition-transform ${open ? 'rotate-180' : ''
                        }`}
                >
                    ▾
                </span>
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                    {/* Header */}
                    <div className="border-b border-border/70 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold">Incident workspace</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    Switch the active incident context
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                {(['SEV-1', 'SEV-2', 'SEV-3'] as Severity[]).map(
                                    (severity) =>
                                        severityCounts[severity] ? (
                                            <span
                                                key={severity}
                                                className={`rounded-full border px-1.5 py-0.5 text-[8px] font-medium ${severityStyles[severity]
                                                    }`}
                                            >
                                                {severityCounts[severity]}
                                            </span>
                                        ) : null,
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Incidents */}
                    <div className="max-h-[360px] overflow-y-auto p-2">
                        {incidents.map((incident) => {
                            const isActive = incident.id === activeIncident?.id;
                            const isSwitching = switching === incident.id;

                            return (
                                <button
                                    key={incident.id}
                                    type="button"
                                    onClick={() => switchIncident(incident.id)}
                                    disabled={switching !== null}
                                    className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${isActive
                                            ? 'bg-muted'
                                            : 'hover:bg-muted/60'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                                            <span
                                                className={`h-2 w-2 rounded-full ${isActive
                                                        ? 'bg-emerald-500'
                                                        : 'bg-muted-foreground/30'
                                                    }`}
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[11px] font-semibold">
                                                        {incident.title}
                                                    </p>

                                                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                                                        {incident.id}
                                                        {incident.opened_by
                                                            ? ` · opened by ${incident.opened_by}`
                                                            : ''}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${severityStyles[incident.severity]
                                                        }`}
                                                >
                                                    {incident.severity}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[9px] capitalize text-muted-foreground">
                                                    {incident.status}
                                                </span>

                                                {isSwitching && (
                                                    <span className="text-[9px] text-muted-foreground">
                                                        Switching...
                                                    </span>
                                                )}

                                                {isActive && !isSwitching && (
                                                    <span className="text-[9px] font-medium text-emerald-600">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border/70 px-4 py-2.5">
                        <p className="text-[9px] text-muted-foreground">
                            Active incident changes the context used by Reson.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}