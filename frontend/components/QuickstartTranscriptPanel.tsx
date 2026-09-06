'use client';

import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};

type QuickstartTranscriptPanelProps = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
};

function formatMessageTime(createdAt?: number) {
  if (!createdAt) return null;

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

function formatTranscriptMarkdown(text: string) {
  let value = text.trim();

  // Transcript collapses all whitespace.
  value = value.replace(/\s+/g, ' ');

  // --------------------------------------------------
  // PROTECT STATUS PAIRS
  // --------------------------------------------------

  const protectedPairs: string[] = [];

  value = value.replace(/\*\([^)]*\)\*/g, (match) => {
    const token = `___STATUS_${protectedPairs.length}___`;
    protectedPairs.push(match);
    return token;
  });

  // --------------------------------------------------
  // INTRO
  // --------------------------------------------------

  value = value.replace(
    /as follows\s*:/i,
    'as follows:\n\n',
  );

  // --------------------------------------------------
  // INCIDENT METADATA
  // --------------------------------------------------

  value = value.replace(
    /(?:-\s*)?\*\*Incident Title:\*\*\s*/i,
    '**Incident Title:** ',
  );

  value = value.replace(
    /\*\*Severity:\*\*\s*/i,
    '\n\n**Severity:** ',
  );

  value = value.replace(
    /\*\*Status:\*\*\s*/i,
    '\n\n**Status:** ',
  );

  // --------------------------------------------------
  // SECTION HEADINGS
  // --------------------------------------------------

  value = value.replace(
    /\s*Facts\s*:\s*/i,
    '\n\n**Facts**\n\n',
  );

  value = value.replace(
    /\s*Hypothes(?:is|es)\s*:\s*/i,
    '\n\n**Hypothesis**\n\n',
  );

  value = value.replace(
    /\s*Actions\s*:\s*/i,
    '\n\n**Actions**\n\n',
  );

  // --------------------------------------------------
  // LIST ITEMS
  // --------------------------------------------------

  // Bullet list items.
  value = value.replace(
    /\s*-\s+(?=[A-Za-z])/g,
    '\n- ',
  );

  // Numbered list items.
  value = value.replace(
    /\s*(?=\d+\.\s+)/g,
    '\n',
  );

  // --------------------------------------------------
  // RESTORE PROTECTED STATUS PAIRS
  // --------------------------------------------------

  value = value.replace(
    /___STATUS_(\d+)___/g,
    (_, index) => protectedPairs[Number(index)],
  );

  // --------------------------------------------------
  // FINAL SENTENCE
  // --------------------------------------------------

  value = value.replace(
    /\.\s*(Let me know\b)/i,
    '.\n\n$1',
  );

  value = value.replace(
    /\.\s*(If you need\b)/i,
    '.\n\n$1',
  );

  value = value.replace(
    /\.\s*(If there's\b)/i,
    '.\n\n$1',
  );

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  return value
    .replace(/^\s+/, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
}: QuickstartTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [currentInProgressMessage, messageList],
  );

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [messages.length, currentInProgressMessage?.text]);



  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card"
      aria-label="Transcription panel"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Transcript
            </span>

            {messages.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                {messages.length}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Live voice conversation
          </p>
        </div>

        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      {/* ONLY this area scrolls */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center px-6 py-20 text-center">
              <div>
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                  ◌
                </div>

                <p className="text-xs font-medium text-foreground">
                  Conversation is ready
                </p>

                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                  Start speaking to see the live transcript here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) => {
                const isAgent = String(message.uid) === agentUID;
                const label = isAgent ? 'Reson' : 'You';
                const text = message.text?.trim();
                const time = formatMessageTime(message.createdAt);

                return (
                  <article
                    key={`${message.turn_id ?? message.uid}-${index}`}
                    className={[
                      'flex w-full flex-col',
                      isAgent ? 'items-start' : 'items-end',
                    ].join(' ')}
                  >
                    {/* Sender + time */}
                    <div
                      className={[
                        'mb-1.5 flex items-center gap-2 px-1',
                        isAgent ? 'justify-start' : 'justify-end',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'text-[10px] font-semibold',
                          isAgent
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {label}
                      </span>

                      {time && (
                        <span className="text-[9px] text-muted-foreground">
                          {time}
                        </span>
                      )}
                    </div>

                    {/* Chat bubble */}
                    <div
                      className={[
                        'max-w-[88%] rounded-2xl border px-4 py-3 text-xs leading-5 shadow-sm',
                        isAgent
                          ? 'rounded-tl-md border-border/70 bg-muted/60 text-foreground'
                          : 'rounded-tr-md border-border bg-background text-foreground',
                      ].join(' ')}
                    >
                      {text ? (
                        <div
                          className={[
                            'transcript-markdown',
                            '[&_p]:mb-2',
                            '[&_p:last-child]:mb-0',
                            '[&_strong]:font-semibold',
                            '[&_ul]:my-2',
                            '[&_ul]:list-disc',
                            '[&_ul]:pl-5',
                            '[&_ol]:my-2',
                            '[&_ol]:list-decimal',
                            '[&_ol]:pl-5',
                            '[&_li]:my-0.5',
                            '[&_h1]:mb-2',
                            '[&_h1]:text-sm',
                            '[&_h1]:font-semibold',
                            '[&_h2]:mb-2',
                            '[&_h2]:text-sm',
                            '[&_h2]:font-semibold',
                            '[&_h3]:mb-1',
                            '[&_h3]:font-semibold',
                            '[&_code]:rounded',
                            '[&_code]:bg-black/5',
                            '[&_code]:px-1',
                            '[&_code]:py-0.5',
                            '[&_code]:text-[11px]',
                            '[&_pre]:my-2',
                            '[&_pre]:overflow-x-auto',
                            '[&_pre]:rounded-lg',
                            '[&_pre]:bg-black/5',
                            '[&_pre]:p-3',
                            '[&_pre_code]:bg-transparent',
                            '[&_pre_code]:p-0',
                          ].join(' ')}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              ul: ({ children }) => (
                                <ul className="my-2 list-disc space-y-1 pl-5">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="my-2 list-decimal space-y-1 pl-5">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="pl-1">
                                  {children}
                                </li>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0">
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                            }}
                          >
                            {formatTranscriptMarkdown(text)}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Listening...
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}