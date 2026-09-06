import React from 'react';

import {
  ConversationErrorCard,
  type ConnectionIssue,
} from './ConversationErrorCard';

type ConnectionStatusPanelProps = {
  connectionState: string;
  connectionSeverity: 'normal' | 'warning' | 'error';
  connectionIssues: ConnectionIssue[];
  isOpen: boolean;
  onToggle: () => void;
};

function getConnectionLabel(
  connectionState: string,
  connectionSeverity: 'normal' | 'warning' | 'error',
): string {
  if (connectionSeverity !== 'normal' && connectionState === 'CONNECTED') {
    return 'Connected (issues detected)';
  }

  if (connectionState === 'CONNECTED') return 'Connected';
  if (connectionState === 'CONNECTING') return 'Connecting...';
  if (connectionState === 'RECONNECTING') return 'Reconnecting...';
  if (connectionState === 'DISCONNECTING') return 'Disconnecting...';

  return 'Disconnected';
}

export function ConnectionStatusPanel({
  connectionState,
  connectionSeverity,
  connectionIssues,
  isOpen,
  onToggle,
}: ConnectionStatusPanelProps) {
  const label = getConnectionLabel(
    connectionState,
    connectionSeverity,
  );

  const dotClass =
    connectionSeverity === 'normal'
      ? 'bg-emerald-500'
      : connectionSeverity === 'warning'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textClass =
    connectionSeverity === 'normal'
      ? 'text-emerald-600 dark:text-emerald-400'
      : connectionSeverity === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  const shouldPulse =
    connectionState !== 'DISCONNECTED' &&
    connectionState !== 'DISCONNECTING';

  return (
    <div className="relative shrink-0">
      {/* Status pill */}
      <button
        type="button"
        className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs transition-colors hover:bg-muted/60"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls="connection-details-panel"
        onClick={onToggle}
      >
        <span className="relative flex h-2 w-2">
          {shouldPulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotClass}`}
            />
          )}

          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`}
          />
        </span>

        <span className={`hidden font-medium sm:inline ${textClass}`}>
          {connectionState === 'CONNECTED'
            ? connectionIssues.length > 0
              ? 'Live'
              : 'Connected'
            : connectionState === 'CONNECTING'
              ? 'Connecting'
              : connectionState === 'RECONNECTING'
                ? 'Reconnecting'
                : 'Offline'}
        </span>

        {connectionIssues.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
            {connectionIssues.length}
          </span>
        )}
      </button>

      {/* Details */}
      <div
        id="connection-details-panel"
        className={[
          'absolute right-0 top-full z-30 mt-2 w-[min(92vw,24rem)]',
          'rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md',
          'transition-all duration-150',
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
        role="status"
        aria-live="polite"
        aria-label="Connection details"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Connection
            </p>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              RTC {connectionState.toLowerCase()}
            </p>
          </div>

          <span
            className={`flex items-center gap-1.5 text-[10px] font-medium ${textClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
            {label}
          </span>
        </div>

        {connectionIssues.length === 0 ? (
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-[10px] text-muted-foreground">
            No RTM or agent errors reported.
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {connectionIssues.map((issue) => (
              <ConversationErrorCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}