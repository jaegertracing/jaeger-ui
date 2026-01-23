// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  exportAsJSON,
  exportAsCSV,
  exportAsHAR,
  downloadFile,
  generateExportFilename,
  exportAndDownloadTrace,
  ExportFormat,
} from './trace-export';
import { IOtelTrace, IOtelSpan, StatusCode, SpanKind } from '../types/otel';
import { Microseconds } from '../types/units';

describe('trace-export', () => {
  const mockTrace: IOtelTrace = {
    traceID: 'test-trace-123',
    traceName: 'Test Trace',
    startTime: 1000000 as unknown as Microseconds,
    endTime: 5000000 as unknown as Microseconds,
    duration: 4000000 as unknown as Microseconds,
    spans: [
      {
        spanID: 'span-1',
        traceID: 'test-trace-123',
        parentSpanID: '',
        name: 'GET /api/users',
        kind: SpanKind.CLIENT,
        startTime: 1000000 as unknown as Microseconds,
        endTime: 3000000 as unknown as Microseconds,
        duration: 2000000 as unknown as Microseconds,
        attributes: [
          { key: 'service.name', value: 'api-service' },
          { key: 'http.method', value: 'GET' },
          { key: 'http.url', value: 'http://localhost:3000/api/users' },
          { key: 'http.status_code', value: 200 },
        ],
        events: [
          {
            name: 'db_query',
            timestamp: 1500000 as unknown as Microseconds,
            attributes: [{ key: 'db.statement', value: 'SELECT * FROM users' }],
          },
        ],
        links: [],
        status: {
          code: StatusCode.OK,
          message: '',
        },
        resource: {
          attributes: [],
          serviceName: 'api-service',
        },
        instrumentationScope: {
          name: 'default',
        },
        depth: 0,
        hasChildren: true,
        childSpans: [],
        relativeStartTime: 0 as unknown as Microseconds,
        inboundLinks: [],
        warnings: [],
      } as unknown as IOtelSpan,
      {
        spanID: 'span-2',
        traceID: 'test-trace-123',
        parentSpanID: 'span-1',
        name: 'Query Database',
        kind: SpanKind.INTERNAL,
        startTime: 1500000 as unknown as Microseconds,
        endTime: 2500000 as unknown as Microseconds,
        duration: 1000000 as unknown as Microseconds,
        attributes: [
          { key: 'service.name', value: 'database' },
          { key: 'db.type', value: 'postgresql' },
        ],
        events: [],
        links: [],
        status: {
          code: StatusCode.OK,
          message: '',
        },
        resource: {
          attributes: [],
          serviceName: 'database',
        },
        instrumentationScope: {
          name: 'default',
        },
        depth: 1,
        hasChildren: false,
        childSpans: [],
        relativeStartTime: 500000 as unknown as Microseconds,
        inboundLinks: [],
        warnings: [],
      } as unknown as IOtelSpan,
    ],
    spanMap: new Map(),
    rootSpans: [],
    services: [],
    orphanSpanCount: 0,
    tracePageTitle: 'Test Trace',
    traceEmoji: '',
    hasErrors: () => false,
  };
  // eslint-enable @typescript-eslint/no-explicit-any

  describe('exportAsJSON', () => {
    it('should export trace as valid JSON', () => {
      const json = exportAsJSON(mockTrace);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('traceID', 'test-trace-123');
      expect(parsed).toHaveProperty('spans');
      expect(parsed.spans).toHaveLength(2);
    });

    it('should include trace summary', () => {
      const json = exportAsJSON(mockTrace);
      const parsed = JSON.parse(json);

      expect(parsed.summary).toHaveProperty('spanCount', 2);
      expect(parsed.summary).toHaveProperty('services');
      expect(parsed.summary.services).toEqual([
        { name: 'api-service', spanCount: 1 },
        { name: 'database', spanCount: 1 },
      ]);
    });

    it('should include span details with proper fields', () => {
      const json = exportAsJSON(mockTrace);
      const parsed = JSON.parse(json);
      const firstSpan = parsed.spans[0];

      expect(firstSpan).toHaveProperty('spanID', 'span-1');
      expect(firstSpan).toHaveProperty('operationName');
      expect(firstSpan).toHaveProperty('serviceName', 'api-service');
      expect(firstSpan).toHaveProperty('duration', 2000000);
      expect(firstSpan).toHaveProperty('status', 'OK');
    });
  });

  describe('exportAsCSV', () => {
    it('should export trace as CSV with headers', () => {
      const csv = exportAsCSV(mockTrace);
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('spanID');
      expect(lines[0]).toContain('operationName');
      expect(lines[0]).toContain('serviceName');
    });

    it('should include all spans in CSV', () => {
      const csv = exportAsCSV(mockTrace);
      const lines = csv.split('\n');
      expect(lines.length).toBe(3);
    });

    it('should escape quotes in CSV values', () => {
      const csv = exportAsCSV(mockTrace);
      expect(csv).toMatch(/"/);
    });
  });

  describe('exportAsHAR', () => {
    it('should export trace as valid HAR format', () => {
      const har = exportAsHAR(mockTrace);
      const parsed = JSON.parse(har);

      expect(parsed).toHaveProperty('log');
      expect(parsed.log).toHaveProperty('version', '1.2');
      expect(parsed.log).toHaveProperty('creator');
      expect(parsed.log).toHaveProperty('entries');
    });

    it('should include HTTP method and URL from attributes', () => {
      const har = exportAsHAR(mockTrace);
      const parsed = JSON.parse(har);
      const firstEntry = parsed.log.entries[0];

      expect(firstEntry.request).toHaveProperty('method', 'GET');
      expect(firstEntry.request).toHaveProperty('url', 'http://localhost:3000/api/users');
    });

    it('should include HTTP status code', () => {
      const har = exportAsHAR(mockTrace);
      const parsed = JSON.parse(har);
      const firstEntry = parsed.log.entries[0];

      expect(firstEntry.response).toHaveProperty('status', 200);
    });
  });

  describe('generateExportFilename', () => {
    it('should generate JSON filename with trace ID', () => {
      const filename = generateExportFilename('trace-abc123', 'json');
      expect(filename).toMatch(/^trace-trace-abc123-/);
      expect(filename).toMatch(/\.json$/);
    });

    it('should generate CSV filename with trace ID', () => {
      const filename = generateExportFilename('trace-xyz789', 'csv');
      expect(filename).toMatch(/^trace-trace-xyz789-/);
      expect(filename).toMatch(/\.csv$/);
    });

    it('should generate HAR filename with trace ID', () => {
      const filename = generateExportFilename('trace-def456', 'har');
      expect(filename).toMatch(/^trace-trace-def456-/);
      expect(filename).toMatch(/\.har$/);
    });

    it('should include timestamp in filename', () => {
      const filename = generateExportFilename('trace-123', 'json');
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      // Mock document methods
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = jest.fn();

      // Mock Blob
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Blob = jest.fn((content, options) => ({
        content,
        options,
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create and click download link', () => {
      const mockClick = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      downloadFile('test content', 'test.txt', 'text/plain');

      expect(mockClick).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should set correct MIME type', () => {
      const mockBlob = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Blob = mockBlob;

      downloadFile('test content', 'test.json', 'application/json');

      expect(mockBlob).toHaveBeenCalledWith(['test content'], { type: 'application/json' });
    });
  });

  describe('exportAndDownloadTrace', () => {
    beforeEach(() => {
      const mockCreateElement = jest.fn();
      mockCreateElement.mockReturnValue({
        ...document.createElement('a'),
        click: jest.fn(),
      });
      jest.spyOn(document, 'createElement').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockCreateElement as unknown as any
      );
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Blob = jest.fn((content, options) => ({
        content,
        options,
      }));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should export and download as JSON', () => {
      exportAndDownloadTrace(mockTrace, 'json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).Blob).toHaveBeenCalledWith(expect.any(Array), { type: 'application/json' });
    });

    it('should export and download as CSV', () => {
      exportAndDownloadTrace(mockTrace, 'csv');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).Blob).toHaveBeenCalledWith(expect.any(Array), { type: 'text/csv' });
    });

    it('should export and download as HAR', () => {
      exportAndDownloadTrace(mockTrace, 'har');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).Blob).toHaveBeenCalledWith(expect.any(Array), { type: 'application/json' });
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        exportAndDownloadTrace(mockTrace, 'xml' as ExportFormat);
      }).toThrow('Unsupported export format: xml');
    });
  });
});
