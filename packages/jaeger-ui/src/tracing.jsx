import { Resource } from '@opentelemetry/resources';

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { WebTracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-web';

import { OTLPTraceExporter }  from '@opentelemetry/exporter-trace-otlp-http';

import { registerInstrumentations } from '@opentelemetry/instrumentation';

import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const consoleExporter = new ConsoleSpanExporter();

const collectorExporter = new OTLPTraceExporter({
  url: `${process.env.OTEL_HOST}:4318/v1/traces`,
  headers: {}

});

const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'Jaeger-UI' || process.env.REACT_APP_NAME
  })
});

const fetchInstrumentation = new FetchInstrumentation({});

fetchInstrumentation.setTracerProvider(provider);

provider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));

provider.addSpanProcessor(new SimpleSpanProcessor(collectorExporter));

provider.register();

registerInstrumentations({
  instrumentations: [
    fetchInstrumentation
  ],

  tracerProvider: provider
});

export default function TraceProvider ({ children }) {
  return (
   <>
      {children}
   </>
  );
}