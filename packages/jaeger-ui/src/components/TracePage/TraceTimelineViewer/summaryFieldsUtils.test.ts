// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../model/transform-trace-data';
import { IOtelTrace } from '../../../types/otel';
import {
  buildHttpStatusSummaryLookup,
  HTTP_STATUS_SUMMARY_FIELD,
  isHttpStatusCode5xx,
} from './summaryFieldsUtils';

const httpStatusTrace = transformTraceData({
  traceID: 'http-status-trace',
  processes: { p1: { serviceName: 'svc', tags: [] } },
  spans: [
    {
      spanID: 's1',
      traceID: 'http-status-trace',
      operationName: 'ok',
      duration: 1,
      startTime: 1,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.status_code', value: '200' }],
    },
    {
      spanID: 's2',
      traceID: 'http-status-trace',
      operationName: 'err',
      duration: 1,
      startTime: 2,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.response.status_code', value: '503' }],
    },
    {
      spanID: 's3',
      traceID: 'http-status-trace',
      operationName: 'none',
      duration: 1,
      startTime: 3,
      processID: 'p1',
      references: [],
      tags: [{ key: 'region', value: 'us-east-1' }],
    },
  ],
})!.asOtelTrace();

describe('summaryFieldsUtils', () => {
  describe('buildHttpStatusSummaryLookup', () => {
    it('maps http.status_code and http.response.status_code to the display field', () => {
      const lookup = buildHttpStatusSummaryLookup(httpStatusTrace);
      expect(lookup.get('s1')).toEqual({ [HTTP_STATUS_SUMMARY_FIELD]: '200' });
      expect(lookup.get('s2')).toEqual({ [HTTP_STATUS_SUMMARY_FIELD]: '503' });
      expect(lookup.has('s3')).toBe(false);
    });

    it('prefers http.status_code when both status attributes are present', () => {
      const trace = {
        spans: [
          {
            spanID: 'both',
            attributes: [
              { key: 'http.status_code', value: '200' },
              { key: 'http.response.status_code', value: '500' },
            ],
            resource: { serviceName: 'svc', attributes: [] },
            name: 'op',
            startTime: 0,
            endTime: 1,
            duration: 1,
            childSpans: [],
            links: [],
            inboundLinks: [],
            events: [],
            status: { code: 0 },
            kind: 0,
          },
        ],
        traceID: 't',
        startTime: 0,
        endTime: 1,
        duration: 1,
        rootSpans: [],
      } as unknown as IOtelTrace;

      const lookup = buildHttpStatusSummaryLookup(trace);
      expect(lookup.get('both')).toEqual({ [HTTP_STATUS_SUMMARY_FIELD]: '200' });
    });

    it('uses a null-prototype values object', () => {
      const pollutedTrace = transformTraceData({
        traceID: 'proto-test',
        processes: { p1: { serviceName: 'svc', tags: [] } },
        spans: [
          {
            spanID: 's1',
            traceID: 'proto-test',
            operationName: 'op',
            duration: 1,
            startTime: 1,
            processID: 'p1',
            references: [],
            tags: [
              { key: 'http.status_code', value: '500' },
              { key: '__proto__', value: 'ignored' },
            ],
          },
        ],
      })!.asOtelTrace();

      const values = buildHttpStatusSummaryLookup(pollutedTrace).get('s1');
      expect(values).toBeDefined();
      expect(values![HTTP_STATUS_SUMMARY_FIELD]).toBe('500');
      expect(Object.getPrototypeOf(values)).toBeNull();
      expect(Object.prototype).not.toHaveProperty('polluted');
    });
  });

  describe('isHttpStatusCode5xx', () => {
    it('returns true only for the summary field key with values >= 500', () => {
      expect(isHttpStatusCode5xx(HTTP_STATUS_SUMMARY_FIELD, '500')).toBe(true);
      expect(isHttpStatusCode5xx(HTTP_STATUS_SUMMARY_FIELD, '503')).toBe(true);
      expect(isHttpStatusCode5xx(HTTP_STATUS_SUMMARY_FIELD, '404')).toBe(false);
      expect(isHttpStatusCode5xx('http.response.status_code', '500')).toBe(false);
      expect(isHttpStatusCode5xx(HTTP_STATUS_SUMMARY_FIELD, 'not-a-number')).toBe(false);
      expect(isHttpStatusCode5xx(HTTP_STATUS_SUMMARY_FIELD, ' 503 ')).toBe(true);
    });
  });
});
