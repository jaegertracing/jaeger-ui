// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span } from '@opentelemetry/sdk-trace-base';
import { PageAttributionProcessor } from './page-attribution';

const SESSION_ID_KEY = 'jaegerUi.tracing.sessionId';

function makeSpan() {
  return { setAttribute: vi.fn() } as unknown as Span;
}

describe('PageAttributionProcessor', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onStart stamps app.url.path and app.session.id on the span', () => {
    const proc = new PageAttributionProcessor();
    const span = makeSpan();

    proc.onStart(span, {} as any);

    expect(span.setAttribute).toHaveBeenCalledWith('app.url.path', window.location.pathname);
    expect(span.setAttribute).toHaveBeenCalledWith('app.session.id', expect.any(String));
  });

  it('reuses the same session id across spans', () => {
    const proc = new PageAttributionProcessor();
    const a = makeSpan();
    const b = makeSpan();

    proc.onStart(a, {} as any);
    proc.onStart(b, {} as any);

    const sessionIdA = (a.setAttribute as ReturnType<typeof vi.fn>).mock.calls.find(
      ([k]) => k === 'app.session.id'
    )?.[1];
    const sessionIdB = (b.setAttribute as ReturnType<typeof vi.fn>).mock.calls.find(
      ([k]) => k === 'app.session.id'
    )?.[1];

    expect(sessionIdA).toBeTruthy();
    expect(sessionIdA).toBe(sessionIdB);
  });

  it('persists session id in sessionStorage so new processors reuse it', () => {
    const first = new PageAttributionProcessor();
    const span1 = makeSpan();
    first.onStart(span1, {} as any);

    const stored = window.sessionStorage.getItem(SESSION_ID_KEY);
    expect(stored).toBeTruthy();

    const second = new PageAttributionProcessor();
    const span2 = makeSpan();
    second.onStart(span2, {} as any);

    const sessionId = (span2.setAttribute as ReturnType<typeof vi.fn>).mock.calls.find(
      ([k]) => k === 'app.session.id'
    )?.[1];
    expect(sessionId).toBe(stored);
  });

  it('falls back to a non-cryptographic id when crypto.randomUUID throws', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('insecure context');
    });

    const proc = new PageAttributionProcessor();
    const span = makeSpan();
    proc.onStart(span, {} as any);

    const sessionId = (span.setAttribute as ReturnType<typeof vi.fn>).mock.calls.find(
      ([k]) => k === 'app.session.id'
    )?.[1];
    expect(sessionId).toMatch(/^s-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('falls back to per-call id when sessionStorage throws', () => {
    vi.spyOn(window.sessionStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('privacy mode');
    });

    const proc = new PageAttributionProcessor();
    const span = makeSpan();
    proc.onStart(span, {} as any);

    const sessionId = (span.setAttribute as ReturnType<typeof vi.fn>).mock.calls.find(
      ([k]) => k === 'app.session.id'
    )?.[1];
    expect(sessionId).toBeTruthy();
  });

  it('onEnd is a no-op and does not throw', () => {
    const proc = new PageAttributionProcessor();
    expect(() => proc.onEnd({} as any)).not.toThrow();
  });

  it('shutdown resolves', async () => {
    const proc = new PageAttributionProcessor();
    await expect(proc.shutdown()).resolves.toBeUndefined();
  });

  it('forceFlush resolves', async () => {
    const proc = new PageAttributionProcessor();
    await expect(proc.forceFlush()).resolves.toBeUndefined();
  });
});
