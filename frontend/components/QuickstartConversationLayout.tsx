'use client';

import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  transcriptPanel,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-left">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold">
            R
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Reson
              </span>

              <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
                AI Incident Commander
              </span>
            </div>

            <div className="mt-0.5 hidden md:block">
              {pipelineMetrics}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusPanel}

          {/* Transcript toggle */}
          <button
            type="button"
            onClick={() => setShowTranscript((open) => !open)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
              showTranscript
                ? 'border-foreground/20 bg-muted text-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
            aria-expanded={showTranscript}
            aria-controls="transcript-side-panel"
          >
            <span className="text-sm">☰</span>
            <span className="hidden sm:inline">Transcript</span>
          </button>

          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-lg border border-destructive bg-transparent px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={onEndConversation}
            aria-label="End conversation with AI agent"
          >
            End Conversation
          </Button>
        </div>
      </header>

      {/* Main workspace */}
      <main
        className={[
          'grid h-0 min-h-0 flex-1 overflow-hidden',
          showTranscript
            ? 'grid-cols-[35%_65%]'
            : 'grid-cols-[100%_0%]',
          'transition-[grid-template-columns] duration-200 ease-out',
        ].join(' ')}
      >
        {/* Voice stage - 35% */}
        <section className="relative min-h-0 min-w-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <div className="flex h-full min-h-0 items-center justify-center px-4">
                {visualizer}
              </div>
            </div>

            <div className="shrink-0 pb-4 pt-2 md:pb-5">
              {controls}
            </div>
          </div>
        </section>

        {/* Transcript - 65% */}
        <aside
          id="transcript-side-panel"
          className="min-h-0 min-w-0 overflow-hidden border-l border-border/70 bg-card"
          aria-hidden={!showTranscript}
        >
          <div className="h-full min-h-0 p-3 xl:p-4">
            <div className="h-full min-h-0">
              {transcriptPanel}
            </div>
          </div>
        </aside>
      </main>

    </div>
  );
}