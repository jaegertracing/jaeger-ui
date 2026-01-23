// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelTrace, IOtelSpan, StatusCode } from '../types/otel';

export type ExportFormat = 'json' | 'csv' | 'har';

/**
 * Flattens span data for CSV export
 */
interface FlattenedSpan {
  spanID: string;
  traceID: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  duration: number;
  tags: string;
  logs: string;
  status: string;
}

/**
 * Converts microseconds to ISO format
 */
function microsToISO(micros: number): string {
  const ms = Math.floor(micros / 1000);
  return new Date(ms).toISOString();
}

/**
 * Get service name from span
 */
function getServiceName(span: IOtelSpan): string {
  const serviceName = span.attributes?.find((attr: any) => attr.key === 'service.name');
  return (serviceName?.value as string) || 'unknown';
}

/**
 * Extract status from span tags/attributes
 */
function getSpanStatus(span: IOtelSpan): string {
  if (span.status?.code === StatusCode.ERROR || span.events?.some((e: any) => e.name === 'exception')) {
    return 'ERROR';
  }
  return span.status?.code === StatusCode.OK ? 'OK' : 'UNSET';
}

/**
 * Export trace as JSON
 */
export function exportAsJSON(trace: IOtelTrace): string {
  const exportData = {
    traceID: trace.traceID,
    traceName: `Trace - ${trace.traceName || 'Unknown'}`,
    exportedAt: new Date().toISOString(),
    summary: {
      startTime: microsToISO(trace.startTime),
      endTime: microsToISO(trace.endTime),
      duration: trace.duration,
      spanCount: trace.spans.length,
      services: Array.from(
        trace.spans
          .reduce((acc, span) => {
            const service = getServiceName(span);
            if (!acc.has(service)) {
              acc.set(service, 0);
            }
            acc.set(service, acc.get(service)! + 1);
            return acc;
          }, new Map<string, number>())
          .entries()
      ).map(([name, count]) => ({ name, spanCount: count })),
    },
    spans: trace.spans.map(span => ({
      spanID: span.spanID,
      traceID: span.traceID,
      parentSpanID: span.parentSpanID || null,
      operationName: span.name,
      serviceName: getServiceName(span),
      startTime: microsToISO(span.startTime),
      duration: span.duration,
      status: getSpanStatus(span),
      tags: span.attributes || [],
      logs: span.events || [],
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Flatten spans for CSV export
 */
function flattenSpans(trace: IOtelTrace): FlattenedSpan[] {
  return trace.spans.map(span => ({
    spanID: span.spanID,
    traceID: span.traceID,
    operationName: span.name,
    serviceName: getServiceName(span),
    startTime: Number(span.startTime),
    duration: Number(span.duration),
    tags: JSON.stringify(span.attributes || []),
    logs: JSON.stringify(span.events || []),
    status: getSpanStatus(span),
  }));
}

/**
 * Convert array of objects to CSV format
 */
function objectsToCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map(h => `"${h}"`).join(',');

  const csvRows = data.map(row =>
    headers
      .map(header => {
        const value = row[header];
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export trace as CSV
 */
export function exportAsCSV(trace: IOtelTrace): string {
  const flatSpans = flattenSpans(trace);
  const csv = objectsToCSV(flatSpans);

  return csv;
}

/**
 * Export trace as HAR (HTTP Archive) format
 * HAR format is useful for analyzing HTTP interactions in traces
 */
export function exportAsHAR(trace: IOtelTrace): string {
  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'Jaeger UI',
        version: '1.0.0',
      },
      entries: trace.spans.map(span => {
        const httpMethod = span.attributes?.find((a: any) => a.key === 'http.method')?.value || 'N/A';
        const httpUrl = span.attributes?.find((a: any) => a.key === 'http.url')?.value || 'N/A';
        const httpStatus = span.attributes?.find((a: any) => a.key === 'http.status_code')?.value;

        return {
          startedDateTime: microsToISO(trace.startTime),
          time: Number(span.duration) / 1000, // in milliseconds
          request: {
            method: httpMethod,
            url: httpUrl,
            httpVersion: 'HTTP/1.1',
            headers:
              span.attributes
                ?.filter((a: any) => a.key.startsWith('http.'))
                .map((a: any) => ({
                  name: a.key,
                  value: String(a.value),
                })) || [],
            queryString: [],
            cookies: [],
            headersSize: -1,
            bodySize: -1,
          },
          response: {
            status: httpStatus ? Number(httpStatus) : 0,
            statusText: httpStatus ? `HTTP ${httpStatus}` : 'N/A',
            httpVersion: 'HTTP/1.1',
            headers: [],
            cookies: [],
            content: {
              size: 0,
              mimeType: 'text/plain',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
          },
          cache: {},
          timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            send: 0,
            wait: Number(span.duration) / 1000,
            receive: 0,
            ssl: -1,
          },
        };
      }),
    },
  };

  return JSON.stringify(har, null, 2);
}

/**
 * Download file helper function
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename for export
 */
export function generateExportFilename(traceID: string, format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = format === 'csv' ? 'csv' : format === 'har' ? 'har' : 'json';
  return `trace-${traceID}-${timestamp}.${extension}`;
}

/**
 * Export trace in specified format and download
 */
export function exportAndDownloadTrace(trace: IOtelTrace, format: ExportFormat): void {
  let content: string;
  let mimeType: string;

  switch (format) {
    case 'json':
      content = exportAsJSON(trace);
      mimeType = 'application/json';
      break;
    case 'csv':
      content = exportAsCSV(trace);
      mimeType = 'text/csv';
      break;
    case 'har':
      content = exportAsHAR(trace);
      mimeType = 'application/json';
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const filename = generateExportFilename(trace.traceID, format);
  downloadFile(content, filename, mimeType);
}
