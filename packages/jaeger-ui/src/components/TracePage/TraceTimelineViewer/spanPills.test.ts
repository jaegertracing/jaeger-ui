// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../model/transform-trace-data';
import { IOtelTrace } from '../../../types/otel';
import { buildSpanPills } from './spanPills';

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

describe('spanPills', () => {
  describe('buildSpanPills', () => {
    it('maps http.status_code and http.response.status_code to pills', () => {
      const spanPills = buildSpanPills(httpStatusTrace);
      expect(spanPills.get('s1')).toEqual([{ label: 'http.status_code', value: '200' }]);
      expect(spanPills.get('s2')).toEqual([{ label: 'http.status_code', value: '503', isError: true }]);
      expect(spanPills.has('s3')).toBe(false);
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

      const spanPills = buildSpanPills(trace);
      expect(spanPills.get('both')).toEqual([{ label: 'http.status_code', value: '200' }]);
    });

    it('falls back to http.response.status_code when http.status_code is empty', () => {
      const trace = {
        spans: [
          {
            spanID: 'empty-primary',
            attributes: [
              { key: 'http.status_code', value: '' },
              { key: 'http.response.status_code', value: '503' },
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

      const spanPills = buildSpanPills(trace);
      expect(spanPills.get('empty-primary')).toEqual([
        { label: 'http.status_code', value: '503', isError: true },
      ]);
    });

    it('sets isError for 5xx status codes only', () => {
      const trace = {
        spans: [
          {
            spanID: 'five',
            attributes: [{ key: 'http.status_code', value: '500' }],
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
          {
            spanID: 'four',
            attributes: [{ key: 'http.status_code', value: '404' }],
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
          {
            spanID: 'bad',
            attributes: [{ key: 'http.status_code', value: 'not-a-number' }],
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

      const spanPills = buildSpanPills(trace);
      expect(spanPills.get('five')).toEqual([{ label: 'http.status_code', value: '500', isError: true }]);
      expect(spanPills.get('four')).toEqual([{ label: 'http.status_code', value: '404' }]);
      expect(spanPills.get('bad')).toEqual([{ label: 'http.status_code', value: 'not-a-number' }]);
    });
  });
});
