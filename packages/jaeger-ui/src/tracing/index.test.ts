// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';

const registerSpy = vi.fn();
const webTracerProviderCtor = vi.fn(function (this: any, opts: unknown) {
  this.register = registerSpy;
  this.opts = opts;
});
const otlpTraceExporterCtor = vi.fn(function (this: any, opts: unknown) {
  this.opts = opts;
});
const batchSpanProcessorCtor = vi.fn(function (this: any, exporter: unknown) {
  this.exporter = exporter;
});
const traceIdRatioBasedSamplerCtor = vi.fn(function (this: any, ratio: number) {
  this.ratio = ratio;
});
const registerInstrumentationsSpy = vi.fn();
const documentLoadInstrumentationCtor = vi.fn(function (this: any) {
  this.name = 'doc-load';
});
const fetchInstrumentationCtor = vi.fn(function (this: any, opts: unknown) {
  this.opts = opts;
});
const pageAttributionProcessorCtor = vi.fn(function (this: any) {
  this.name = 'page-attribution';
});

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  BatchSpanProcessor: batchSpanProcessorCtor,
  TraceIdRatioBasedSampler: traceIdRatioBasedSamplerCtor,
}));
vi.mock('@opentelemetry/sdk-trace-web', () => ({
  WebTracerProvider: webTracerProviderCtor,
}));
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: otlpTraceExporterCtor,
}));
vi.mock('@opentelemetry/instrumentation', () => ({
  registerInstrumentations: registerInstrumentationsSpy,
}));
vi.mock('@opentelemetry/instrumentation-document-load', () => ({
  DocumentLoadInstrumentation: documentLoadInstrumentationCtor,
}));
vi.mock('@opentelemetry/instrumentation-fetch', () => ({
  FetchInstrumentation: fetchInstrumentationCtor,
}));
vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: (attrs: unknown) => ({ attrs }),
}));
vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));
vi.mock('./page-attribution', () => ({
  PageAttributionProcessor: pageAttributionProcessorCtor,
}));
vi.mock('../utils/config/get-config', () => mockDefault(vi.fn()));
vi.mock('../utils/prefix-url', () => mockDefault((v: string) => `/jaeger${v}`));

import getConfig from '../utils/config/get-config';

const mockGetConfig = getConfig as unknown as ReturnType<typeof vi.fn>;

describe('initTracing', () => {
  beforeEach(() => {
    vi.resetModules();
    registerSpy.mockClear();
    webTracerProviderCtor.mockClear();
    otlpTraceExporterCtor.mockClear();
    batchSpanProcessorCtor.mockClear();
    traceIdRatioBasedSamplerCtor.mockClear();
    registerInstrumentationsSpy.mockClear();
    documentLoadInstrumentationCtor.mockClear();
    fetchInstrumentationCtor.mockClear();
    pageAttributionProcessorCtor.mockClear();
    mockGetConfig.mockReset();
  });

  async function loadInitTracing() {
    const mod = await import('./index');
    return mod.initTracing;
  }

  it('is a no-op when tracing config is absent', async () => {
    mockGetConfig.mockReturnValue({});
    const initTracing = await loadInitTracing();
    initTracing();
    expect(webTracerProviderCtor).not.toHaveBeenCalled();
    expect(registerInstrumentationsSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when tracing.enabled is false', async () => {
    mockGetConfig.mockReturnValue({ tracing: { enabled: false } });
    const initTracing = await loadInitTracing();
    initTracing();
    expect(webTracerProviderCtor).not.toHaveBeenCalled();
  });

  it('initializes a provider when tracing.enabled is true', async () => {
    mockGetConfig.mockReturnValue({ tracing: { enabled: true } });
    const initTracing = await loadInitTracing();
    initTracing();

    expect(webTracerProviderCtor).toHaveBeenCalledTimes(1);
    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerInstrumentationsSpy).toHaveBeenCalledTimes(1);
    expect(pageAttributionProcessorCtor).toHaveBeenCalledTimes(1);
    expect(pageAttributionProcessorCtor).toHaveBeenCalledWith({ inactivityMs: undefined });
    expect(batchSpanProcessorCtor).toHaveBeenCalledTimes(1);
  });

  it('converts tracing.sessionInactivityMinutes to milliseconds for the page-attribution processor', async () => {
    mockGetConfig.mockReturnValue({
      tracing: { enabled: true, sessionInactivityMinutes: 5 },
    });
    const initTracing = await loadInitTracing();
    initTracing();

    expect(pageAttributionProcessorCtor).toHaveBeenCalledWith({ inactivityMs: 5 * 60_000 });
  });

  it('uses defaults for sampleRatio and serviceName when unset, and prefixes the OTLP endpoint', async () => {
    mockGetConfig.mockReturnValue({ tracing: { enabled: true } });
    const initTracing = await loadInitTracing();
    initTracing();

    expect(traceIdRatioBasedSamplerCtor).toHaveBeenCalledWith(1.0);
    expect(otlpTraceExporterCtor).toHaveBeenCalledWith({ url: '/jaeger/api/otlp/v1/traces' });

    const providerArgs = webTracerProviderCtor.mock.calls[0][0] as any;
    expect(providerArgs.resource.attrs).toMatchObject({
      'service.name': 'jaeger-ui',
      'service.version': expect.any(String),
    });
  });

  it('honors configured serviceName and sampleRatio', async () => {
    mockGetConfig.mockReturnValue({
      tracing: { enabled: true, serviceName: 'my-ui', sampleRatio: 0.25 },
    });
    const initTracing = await loadInitTracing();
    initTracing();

    expect(traceIdRatioBasedSamplerCtor).toHaveBeenCalledWith(0.25);
    const providerArgs = webTracerProviderCtor.mock.calls[0][0] as any;
    expect(providerArgs.resource.attrs['service.name']).toBe('my-ui');
  });

  it('configures FetchInstrumentation to ignore the OTLP export endpoint', async () => {
    mockGetConfig.mockReturnValue({ tracing: { enabled: true } });
    const initTracing = await loadInitTracing();
    initTracing();

    const fetchOpts = fetchInstrumentationCtor.mock.calls[0][0] as any;
    expect(fetchOpts.ignoreUrls).toEqual(['/jaeger/api/otlp/v1/traces']);
  });

  it('is idempotent — second call does not re-register', async () => {
    mockGetConfig.mockReturnValue({ tracing: { enabled: true } });
    const initTracing = await loadInitTracing();
    initTracing();
    initTracing();
    expect(webTracerProviderCtor).toHaveBeenCalledTimes(1);
    expect(registerInstrumentationsSpy).toHaveBeenCalledTimes(1);
  });
});
