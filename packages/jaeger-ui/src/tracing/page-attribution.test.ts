// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span } from '@opentelemetry/sdk-trace-base';
import { PageAttributionProcessor } from './page-attribution';

const SESSION_ID_KEY = 'jaeger.tracing.sessionId';
const SESSION_LAST_ACTIVITY_KEY = 'jaeger.tracing.sessionLastActivity';

function makeSpan(traceId: string) {
  const calls = new Map<string, unknown>();
  const setAttribute = vi.fn((key: string, value: unknown) => {
    calls.set(key, value);
  });
  const span = {
    setAttribute,
    spanContext: () => ({ traceId }),
  } as unknown as Span;
  return { span, attrs: calls, setAttribute };
}

describe('PageAttributionProcessor', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stamps app.url.path and session.id on every span', () => {
    const proc = new PageAttributionProcessor();
    const { span, attrs } = makeSpan('trace-1');
    proc.onStart(span, {} as any);

    expect(attrs.get('app.url.path')).toBe(window.location.pathname);
    expect(attrs.get('session.id')).toBe('trace-1');
  });

  it('uses the first span trace id as the session id', () => {
    const proc = new PageAttributionProcessor();
    const a = makeSpan('trace-A');
    const b = makeSpan('trace-B');

    proc.onStart(a.span, {} as any);
    proc.onStart(b.span, {} as any);

    expect(a.attrs.get('session.id')).toBe('trace-A');
    expect(b.attrs.get('session.id')).toBe('trace-A');
  });

  it('persists session id and last-activity to sessionStorage', () => {
    const proc = new PageAttributionProcessor();
    const { span } = makeSpan('trace-1');
    proc.onStart(span, {} as any);

    expect(window.sessionStorage.getItem(SESSION_ID_KEY)).toBe('trace-1');
    expect(Number(window.sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY))).toBeGreaterThan(0);
  });

  it('reuses a session id stored by a prior processor (e.g. across page reloads)', () => {
    window.sessionStorage.setItem(SESSION_ID_KEY, 'prior-trace');
    window.sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));

    const proc = new PageAttributionProcessor();
    const { span, attrs } = makeSpan('fresh-trace');
    proc.onStart(span, {} as any);

    expect(attrs.get('session.id')).toBe('prior-trace');
    expect(attrs.has('session.previous_id')).toBe(false);
  });

  it('does not stamp session.previous_id during a single active session', () => {
    const proc = new PageAttributionProcessor();
    const a = makeSpan('trace-A');
    const b = makeSpan('trace-B');
    proc.onStart(a.span, {} as any);
    proc.onStart(b.span, {} as any);

    expect(a.attrs.has('session.previous_id')).toBe(false);
    expect(b.attrs.has('session.previous_id')).toBe(false);
  });

  it('rotates session.id and stamps session.previous_id after inactivity timeout', () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const proc = new PageAttributionProcessor({ inactivityMs: 60_000 });

    const a = makeSpan('trace-A');
    proc.onStart(a.span, {} as any);
    expect(a.attrs.get('session.id')).toBe('trace-A');

    // Advance past the inactivity window.
    dateSpy.mockReturnValue(1_000_000 + 61_000);
    const b = makeSpan('trace-B');
    proc.onStart(b.span, {} as any);

    expect(b.attrs.get('session.id')).toBe('trace-B');
    expect(b.attrs.get('session.previous_id')).toBe('trace-A');

    // Subsequent spans in the new session should NOT include previous_id.
    dateSpy.mockReturnValue(1_000_000 + 62_000);
    const c = makeSpan('trace-C');
    proc.onStart(c.span, {} as any);
    expect(c.attrs.get('session.id')).toBe('trace-B');
    expect(c.attrs.has('session.previous_id')).toBe(false);
  });

  it('rotates a stored session when sessionStorage has a corrupted last-activity value', () => {
    window.sessionStorage.setItem(SESSION_ID_KEY, 'stale-trace');
    window.sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, 'not-a-number');
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    const proc = new PageAttributionProcessor({ inactivityMs: 1000 });
    const { span, attrs } = makeSpan('new-trace');
    proc.onStart(span, {} as any);

    // NaN comparisons would block rotation forever; we expect the
    // corrupted timestamp to be treated as 0 and rotate the session.
    expect(attrs.get('session.id')).toBe('new-trace');
    expect(attrs.get('session.previous_id')).toBe('stale-trace');
  });

  it('rotates a stored session loaded from sessionStorage when it has expired', () => {
    window.sessionStorage.setItem(SESSION_ID_KEY, 'stale-trace');
    window.sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(1_000_000));
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 31 * 60 * 1000);

    const proc = new PageAttributionProcessor();
    const { span, attrs } = makeSpan('new-trace');
    proc.onStart(span, {} as any);

    expect(attrs.get('session.id')).toBe('new-trace');
    expect(attrs.get('session.previous_id')).toBe('stale-trace');
  });

  it('honors a custom inactivityMs', () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(0);
    const proc = new PageAttributionProcessor({ inactivityMs: 10 });

    const a = makeSpan('trace-A');
    proc.onStart(a.span, {} as any);

    dateSpy.mockReturnValue(20);
    const b = makeSpan('trace-B');
    proc.onStart(b.span, {} as any);

    expect(b.attrs.get('session.id')).toBe('trace-B');
    expect(b.attrs.get('session.previous_id')).toBe('trace-A');
  });

  it('falls back to in-memory state when sessionStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('privacy mode');
    });

    const proc = new PageAttributionProcessor();
    const a = makeSpan('trace-A');
    const b = makeSpan('trace-B');
    proc.onStart(a.span, {} as any);
    proc.onStart(b.span, {} as any);

    expect(a.attrs.get('session.id')).toBe('trace-A');
    expect(b.attrs.get('session.id')).toBe('trace-A');
  });

  it('does not throw when sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const proc = new PageAttributionProcessor();
    const { span, attrs } = makeSpan('trace-A');
    expect(() => proc.onStart(span, {} as any)).not.toThrow();
    expect(attrs.get('session.id')).toBe('trace-A');
  });

  it('onEnd, shutdown, and forceFlush are no-ops', async () => {
    const proc = new PageAttributionProcessor();
    expect(() => proc.onEnd({} as any)).not.toThrow();
    await expect(proc.shutdown()).resolves.toBeUndefined();
    await expect(proc.forceFlush()).resolves.toBeUndefined();
  });
});
