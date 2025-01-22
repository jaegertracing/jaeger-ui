import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

console.log('1. Starting OpenTelemetry initialization');

try {
  console.log('2. Creating exporter');
  const exporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', // why relative URL doesn't work? '/v1/traces' ???
    headers: {},
  });

  console.log('3. Creating provider');
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'jaeger-ui',
    }),
  });

  console.log('4. Adding span processor');
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  console.log('5. Registering instrumentations');
  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        ignoreUrls: [/localhost:3000\/sockjs-node/]
      }),
      new UserInteractionInstrumentation(),
    ],
    tracerProvider: provider,
  });

  console.log('6. Registering provider');
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  console.log('7. OpenTelemetry initialized successfully');
} catch (error) {
  console.error('OpenTelemetry initialization failed:', error);
}