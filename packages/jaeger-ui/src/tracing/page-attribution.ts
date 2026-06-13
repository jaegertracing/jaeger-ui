// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Context } from '@opentelemetry/api';
import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

const SESSION_ID_KEY = 'jaeger.tracing.sessionId';
const SESSION_LAST_ACTIVITY_KEY = 'jaeger.tracing.sessionLastActivity';
const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000;

/**
 * Stamps every span with attributes identifying the page and user session
 * that issued it. Implements OTel's session semantic convention:
 * https://opentelemetry.io/docs/specs/semconv/general/session/
 *
 *  - url.path: window.location.pathname
 *  - session.id: derived from the trace id of the first span of the
 *    session. Scoped to the browser tab (sessionStorage) and rotated
 *    after a configurable period of inactivity (default 30 minutes).
 *  - session.previous_id: stamped only on the first span of a rotated
 *    session, per the OTel spec.
 */
export class PageAttributionProcessor implements SpanProcessor {
  private readonly inactivityMs: number;
  private sessionId: string | undefined;
  private lastActivity = 0;
  private pendingPreviousId: string | undefined;
  private initialized = false;

  constructor(opts?: { inactivityMs?: number }) {
    this.inactivityMs = opts?.inactivityMs ?? DEFAULT_INACTIVITY_MS;
  }

  onStart(span: Span, _parentContext: Context): void {
    const now = Date.now();

    if (!this.initialized) {
      this.loadFromStorage();
      this.initialized = true;
    }

    if (this.sessionId && now - this.lastActivity > this.inactivityMs) {
      this.pendingPreviousId = this.sessionId;
      this.sessionId = undefined;
    }

    if (!this.sessionId) {
      this.sessionId = span.spanContext().traceId;
      this.write(SESSION_ID_KEY, this.sessionId);
    }

    span.setAttribute('url.path', window.location.pathname);
    span.setAttribute('session.id', this.sessionId);
    if (this.pendingPreviousId) {
      span.setAttribute('session.previous_id', this.pendingPreviousId);
      this.pendingPreviousId = undefined;
    }

    this.lastActivity = now;
    this.write(SESSION_LAST_ACTIVITY_KEY, String(now));
  }

  private loadFromStorage(): void {
    try {
      this.sessionId = window.sessionStorage.getItem(SESSION_ID_KEY) ?? undefined;
      const la = window.sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
      this.lastActivity = la ? Number(la) : 0;
    } catch {
      // sessionStorage can throw in privacy modes; use in-memory state only.
    }
  }

  private write(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // sessionStorage can throw in privacy modes; ignore.
    }
  }

  onEnd(_span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
