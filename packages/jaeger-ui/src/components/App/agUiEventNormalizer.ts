// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * AG-UI events as the assistant panel sees them.
 *
 * @assistant-ui/react-ag-ui 0.0.35 keeps one text part per `messageId` and
 * appends later deltas to that part even after a tool call. Jaeger's gateway
 * uses a single message id for the whole run, so every text chunk collapses
 * into one block and tool calls render in a group before or after it.
 * Rewriting the id after each tool call (and after a text message ends) makes
 * the same aggregator emit parts in arrival order. Deltas are copied through
 * unchanged, including leading, trailing, and whitespace-only chunks.
 */
export interface IAgUiStreamEvent {
  type: string;
  messageId?: string;
  delta?: string;
  toolCallId?: string;
  toolCallName?: string;
  parentMessageId?: string;
}

interface INormalizerState {
  segment: number;
  toolBoundary: boolean;
  closed: Set<string>;
  activeId: Map<string, string>;
}

const ANONYMOUS_KEY = '__anonymous__';

function segmentKey(messageId: string | undefined): string {
  return messageId ?? ANONYMOUS_KEY;
}

function createState(): INormalizerState {
  return {
    segment: 0,
    toolBoundary: false,
    closed: new Set(),
    activeId: new Map(),
  };
}

function segmentId(state: INormalizerState, messageId: string | undefined, forceNew: boolean): string {
  const key = segmentKey(messageId);
  const current = state.activeId.get(key);
  if (!forceNew && current) return current;
  if (!forceNew) {
    const id = messageId ?? `text-${(state.segment += 1)}`;
    state.activeId.set(key, id);
    return id;
  }
  state.segment += 1;
  const id = `${messageId ?? 'text'}~${state.segment}`;
  state.activeId.set(key, id);
  return id;
}

function createAgUiEventNormalizer() {
  const state = createState();

  function normalize<T extends IAgUiStreamEvent>(event: T): T {
    switch (event.type) {
      case 'RUN_STARTED':
        state.segment = 0;
        state.toolBoundary = false;
        state.closed.clear();
        state.activeId.clear();
        return event;
      case 'TOOL_CALL_START':
        state.toolBoundary = true;
        return event;
      case 'TOOL_CALL_CHUNK':
        if (event.toolCallName) state.toolBoundary = true;
        return event;
      case 'TEXT_MESSAGE_END': {
        const key = segmentKey(event.messageId);
        state.closed.add(key);
        const messageId = state.activeId.get(key) ?? event.messageId;
        return { ...event, messageId };
      }
      case 'TEXT_MESSAGE_START':
      case 'TEXT_MESSAGE_CONTENT':
      case 'TEXT_MESSAGE_CHUNK': {
        const key = segmentKey(event.messageId);
        const forceNew = state.toolBoundary || state.closed.has(key);
        const messageId = segmentId(state, event.messageId, forceNew);
        if (forceNew) {
          state.toolBoundary = false;
          state.closed.delete(key);
        }
        if (event.type === 'TEXT_MESSAGE_START') return { ...event, messageId };
        // Copy delta verbatim. Whitespace-only chunks are real paragraph
        // breaks; trimming them is what glues "critical path." to "MySQL".
        return { ...event, messageId, delta: event.delta };
      }
      default:
        return event;
    }
  }

  return { normalize };
}

export function normalizeAgUiEvents<T extends IAgUiStreamEvent>(events: readonly T[]): T[] {
  const normalizer = createAgUiEventNormalizer();
  return events.map(event => normalizer.normalize(event));
}

const TEXT_AND_TOOL_HANDLERS = [
  'onTextMessageStartEvent',
  'onTextMessageContentEvent',
  'onTextMessageEndEvent',
  'onTextMessageChunkEvent',
  'onToolCallStartEvent',
  'onToolCallChunkEvent',
] as const;

function wrapAgUiSubscriber(subscriber: Record<string, unknown>): Record<string, unknown> {
  const normalizer = createAgUiEventNormalizer();
  const wrapped: Record<string, unknown> = { ...subscriber };
  for (const name of TEXT_AND_TOOL_HANDLERS) {
    const original = subscriber[name];
    if (typeof original !== 'function') continue;
    wrapped[name] = (payload: { event?: IAgUiStreamEvent }) => {
      if (!payload?.event || typeof payload.event !== 'object') return original(payload);
      return original({ ...payload, event: normalizer.normalize(payload.event) });
    };
  }
  return wrapped;
}

export function attachAgUiEventNormalizer<T extends object>(agent: T): T {
  const record = agent as T & {
    runAgent?: (input?: unknown, subscriber?: unknown, ...rest: unknown[]) => unknown;
  };
  const original = record.runAgent;
  if (typeof original !== 'function') return agent;
  record.runAgent = (input?: unknown, subscriber?: unknown, ...rest: unknown[]) => {
    const nextSubscriber =
      subscriber && typeof subscriber === 'object'
        ? wrapAgUiSubscriber(subscriber as Record<string, unknown>)
        : subscriber;
    return original.call(record, input, nextSubscriber, ...rest);
  };
  return agent;
}
