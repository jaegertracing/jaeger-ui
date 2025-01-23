// Copyright (c) 2018 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import getConfig from './utils/config/get-config';

try {
  const { otlp } = getConfig().tracing || {};
  const exporter = new OTLPTraceExporter({
    url: otlp?.endpoint,
    headers: {},
  });

  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: otlp?.serviceName,
    }),
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  registerInstrumentations({
    instrumentations: [new DocumentLoadInstrumentation(), new UserInteractionInstrumentation()],
    tracerProvider: provider,
  });

  provider.register({
    contextManager: new ZoneContextManager(),
  });
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('OpenTelemetry initialization failed:', error);
}
