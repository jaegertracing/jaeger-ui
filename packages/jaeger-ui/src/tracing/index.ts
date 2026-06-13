// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { BatchSpanProcessor, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import getConfig from '../utils/config/get-config';
import prefixUrl from '../utils/prefix-url';
import { PageAttributionProcessor } from './page-attribution';
import { version } from '../../package.json';

const DEFAULT_ENDPOINT = '/api/otlp/v1/traces';

let initialized = false;

// Same-origin paths get the UI's site-prefix (e.g. '/jaeger') applied so
// base-path deployments POST to the right route. Absolute URLs (used for
// the cross-origin override, Pattern C in ADR-0011) pass through untouched.
function resolveEndpoint(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint) || endpoint.startsWith('//')) {
    return endpoint;
  }
  return prefixUrl(endpoint);
}

/**
 * Initializes browser-side OpenTelemetry instrumentation if the UI is
 * configured for it. Idempotent and no-op when tracing.enabled is false.
 *
 * Call this once at startup, before React mounts, so the document-load
 * instrumentation captures the initial render.
 */
export function initTracing(): void {
  if (initialized) return;

  const cfg = getConfig().tracing;
  if (!cfg?.enabled) return;

  const endpoint = resolveEndpoint(cfg.endpoint ?? DEFAULT_ENDPOINT);

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: cfg.serviceName ?? 'jaeger-ui',
      [ATTR_SERVICE_VERSION]: version,
    }),
    sampler: new TraceIdRatioBasedSampler(cfg.sampleRatio ?? 1.0),
    spanProcessors: [
      new PageAttributionProcessor({
        inactivityMs:
          cfg.sessionInactivityMinutes != null ? cfg.sessionInactivityMinutes * 60_000 : undefined,
      }),
      new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint })),
    ],
  });

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        // Don't trace the export request itself — that would recurse.
        ignoreUrls: [new RegExp(`^${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)],
      }),
    ],
  });

  initialized = true;
}
