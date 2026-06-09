// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Context } from '@opentelemetry/api';
import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

const SESSION_ID_KEY = 'jaegerUi.tracing.sessionId';

// crypto.randomUUID requires a secure context. Fall back to a
// non-cryptographic ID — for span attribution, uniqueness within a tab
// session is sufficient and crashing tracing init is not acceptable.
function safeUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const next = safeUuid();
    window.sessionStorage.setItem(SESSION_ID_KEY, next);
    return next;
  } catch {
    // sessionStorage can throw in privacy modes; fall back to per-call ID.
    return safeUuid();
  }
}

/**
 * Stamps every span with attributes identifying the page that issued it.
 * This is what makes single-span fetch traces useful — even when no
 * higher-level root (page-load, assistant turn) is active, the resulting
 * one-span trace tells you which page issued the call.
 *
 *  - app.url.path: window.location.pathname (full path, high cardinality)
 *  - app.session.id: stable per-tab UUID kept in sessionStorage
 */
export class PageAttributionProcessor implements SpanProcessor {
  private readonly sessionId = getOrCreateSessionId();

  onStart(span: Span, _parentContext: Context): void {
    span.setAttribute('app.url.path', window.location.pathname);
    span.setAttribute('app.session.id', this.sessionId);
  }

  onEnd(_span: ReadableSpan): void {}

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
