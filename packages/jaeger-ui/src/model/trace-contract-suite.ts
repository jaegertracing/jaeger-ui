// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IOtelTrace } from '../types/otel';

export interface ITraceContractPipeline<T> {
  name: string;
  load(caseName: string): T;
  parse(fixture: T): IOtelTrace;
}

export function runTraceContractSuite<T>(pipeline: ITraceContractPipeline<T>) {
  const parse = (caseName: string) => pipeline.parse(pipeline.load(caseName));

  describe(`trace contract: ${pipeline.name}`, () => {
    it.each(['root-missing-reference', 'root-no-references'])(
      'names the trace from the root in %s',
      caseName => {
        expect(parse(caseName).traceName).toBe('serviceName: rootOperation');
      }
    );

    it('keeps zero and missing start times in the render tree', () => {
      const trace = parse('zero-start-times');
      expect(trace.spans.map(span => span.spanID)).toEqual([
        'd4dcb46e95b781f5',
        '0000000000000001',
        '0000000000000002',
      ]);
      expect(trace.startTime).toBe(0);
      expect(trace.spans.every(span => span.startTime === 0)).toBe(true);
      expect(trace.spanMap.get('d4dcb46e95b781f5')?.hasChildren).toBe(true);
    });

    it('repairs missing child start times without stretching the trace', () => {
      const trace = parse('parent-time-repair');
      const realStart = 1784570820629325;
      expect(trace.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000001')?.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000002')?.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000001')?.relativeStartTime).toBe(0);
      expect(trace.duration).toBe(1000);
    });

    it('repairs missing start times through a parent chain', () => {
      const trace = parse('transitive-time-repair');
      const realStart = 1784570820629325;
      expect(trace.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000003')?.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000004')?.startTime).toBe(realStart);
      expect(trace.spanMap.get('0000000000000004')?.relativeStartTime).toBe(0);
      expect(trace.duration).toBe(1000);
    });

    it('falls back to zero when the root has no start time', () => {
      const trace = parse('missing-root-start');
      expect(trace.spanMap.get('d4dcb46e95b781f5')?.startTime).toBe(0);
      expect(trace.spanMap.get('0000000000000005')?.startTime).toBe(0);
      expect(trace.startTime).toBe(0);
    });

    it('repairs missing sibling times and retains their order', () => {
      const trace = parse('missing-sibling-times');
      expect(trace.spans).toHaveLength(3);
      expect(trace.spans.every(span => Number.isFinite(span.startTime))).toBe(true);
      expect(trace.spanMap.get('0000000000000031')?.startTime).toBe(1784570820629825);
      expect(trace.spans.at(-1)?.spanID).toBe('0000000000000031');
    });

    it.each([
      ['root-missing-reference', 1],
      ['multiple-orphans', 2],
      ['root-no-references', 0],
      ['follows-from-orphan', 1],
    ])('counts orphans in %s', (caseName, count) => {
      expect(parse(caseName).orphanSpanCount).toBe(count);
    });

    it('builds a span map with all spans', () => {
      const trace = parse('root-no-references');
      expect(trace.spanMap).toBeInstanceOf(Map);
      expect(trace.spanMap.size).toBe(3);
      expect(trace.spanMap.has('d4dcb46e95b781f5')).toBe(true);
      expect(trace.spanMap.has('41f71485ed2593e4')).toBe(true);
      expect(trace.spanMap.has('4f623fd33c213cba')).toBe(true);
    });

    it('identifies the root and its sorted children', () => {
      const trace = parse('root-no-references');
      expect(trace.rootSpans).toHaveLength(1);
      expect(trace.rootSpans[0].spanID).toBe('d4dcb46e95b781f5');
      expect(trace.rootSpans[0].name).toBe('rootOperation');
      const root = trace.spanMap.get('d4dcb46e95b781f5');
      expect(root?.childSpans.map(child => child.spanID)).toEqual(['41f71485ed2593e4', '4f623fd33c213cba']);
      expect(root?.childSpans.every(child => child.childSpans.length === 0)).toBe(true);
      root?.childSpans.forEach(child => {
        expect(child.name).toBeDefined();
        expect(child).toBe(trace.spanMap.get(child.spanID));
      });
    });

    it('keeps the missing-parent root and its children', () => {
      const trace = parse('root-missing-reference');
      expect(trace.rootSpans).toHaveLength(1);
      expect(trace.rootSpans[0].spanID).toBe('d4dcb46e95b781f5');
      expect(trace.spanMap.get('d4dcb46e95b781f5')?.childSpans).toHaveLength(2);
    });

    it('keeps multiple roots', () => {
      const trace = parse('multiple-roots');
      expect(trace.rootSpans.map(span => span.spanID)).toEqual(['d4dcb46e95b781f5', '0000000000000009']);
    });

    it('sets depth, child flags, and depth-first order', () => {
      const trace = parse('hierarchy');
      const map = trace.spanMap;
      expect(map.get('0000000000000010')?.depth).toBe(0);
      expect(map.get('0000000000000011')?.depth).toBe(1);
      expect(map.get('0000000000000013')?.depth).toBe(2);
      expect(map.get('0000000000000012')?.depth).toBe(1);
      expect(map.get('0000000000000010')?.hasChildren).toBe(true);
      expect(map.get('0000000000000011')?.hasChildren).toBe(true);
      expect(map.get('0000000000000013')?.hasChildren).toBe(false);
      expect(map.get('0000000000000012')?.hasChildren).toBe(false);
      expect(trace.spans.map(span => span.spanID)).toEqual([
        '0000000000000010',
        '0000000000000011',
        '0000000000000013',
        '0000000000000012',
      ]);
    });

    it('exposes secondary references as links and inbound links', () => {
      const trace = parse('multi-reference');
      expect(trace.spans.filter(span => span.links.length > 0)).toHaveLength(1);
      expect(trace.spans.filter(span => span.inboundLinks.length > 0)).toHaveLength(1);
      const linked = trace.spanMap.get('0000000000000023');
      expect(linked?.parentSpanID).toBe('0000000000000021');
      expect(linked?.links.map(link => link.spanID)).toEqual(['0000000000000022']);
      expect(trace.spanMap.get('0000000000000022')?.inboundLinks.map(link => link.spanID)).toEqual([
        '0000000000000023',
      ]);
    });
  });
}
