// Copyright (c) 2019 Uber Technologies, Inc.
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

import JaegerAPI from '../api/jaeger';

function tryParseMultiLineInput(input: string): any[] {
  const jsonStrings = input.split('\n').filter((line: string) => line.trim() !== '');
  const parsedObjects: any[] = [];

  jsonStrings.forEach((jsonString: string, index: number) => {
    try {
      const traceObj = JSON.parse(jsonString.trim());
      parsedObjects.push(traceObj);
    } catch (error) {
      throw new Error(`Error parsing JSON at line ${index + 1}: ${(error as Error).message}`);
    }
  });

  return parsedObjects;
}

function validateSpan(span: any): boolean {
  return !!(
    span.traceID &&
    span.spanID &&
    span.operationName &&
    typeof span.startTime === 'number' &&
    typeof span.duration === 'number' &&
    span.processID &&
    typeof span.processID === 'string'
  );
}

function validateProcess(process: any): boolean {
  return !!(
    process &&
    typeof process === 'object' &&
    process.serviceName &&
    typeof process.serviceName === 'string'
  );
}

function isOTelSpan(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    'context' in obj &&
    typeof obj.context === 'object' &&
    'trace_id' in obj.context &&
    'span_id' in obj.context
  );
}

function convertOTelSpanToOTLP(span: any): any {
  return {
    resourceSpans: [
      {
        resource: span.resource || {
          attributes: {
            'service.name': 'unknown_service',
          },
        },
        scopeSpans: [
          {
            scope: {},
            spans: [
              {
                traceId: span.context.trace_id.replace('0x', ''),
                spanId: span.context.span_id.replace('0x', ''),
                parentSpanId: span.parent_id?.replace('0x', ''),
                name: span.name,
                kind: span.kind,
                startTimeUnixNano: new Date(span.start_time).getTime() * 1000000,
                endTimeUnixNano: new Date(span.end_time).getTime() * 1000000,
                attributes: Object.entries(span.attributes || {}).map(([k, v]) => ({
                  key: k,
                  value: { stringValue: String(v) },
                })),
                status: span.status,
              },
            ],
          },
        ],
      },
    ],
  };
}

function validateJaegerTrace(trace: any): boolean {
  if (!trace) return false;

  if (isOTelSpan(trace)) {
    return true;
  }

  if (typeof trace === 'object' && Object.keys(trace).length > 0) {
    if (!trace.traceID && !trace.spans && !trace.processes && !('resourceSpans' in trace)) {
      return true;
    }
  }

  if ('resourceSpans' in trace) return true;

  if (Array.isArray(trace.data)) {
    return trace.data.every((item: any) => validateSingleTrace(item));
  }

  return validateSingleTrace(trace);
}

function validateSingleTrace(trace: any): boolean {
  if (
    !trace.traceID ||
    !Array.isArray(trace.spans) ||
    !trace.processes ||
    typeof trace.processes !== 'object'
  ) {
    return false;
  }

  const validSpans = trace.spans.every(validateSpan);
  if (!validSpans) return false;

  const validProcesses = Object.values(trace.processes).every(validateProcess);
  if (!validProcesses) return false;

  return trace.spans.every((span: any) => span.processID && trace.processes[span.processID]);
}

export default function readJsonFile(fileList: { file: File }): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Invalid result type'));
        return;
      }
      let traceObj;
      try {
        traceObj = JSON.parse(reader.result);
      } catch (error) {
        try {
          traceObj = tryParseMultiLineInput(reader.result);
        } catch (error) {
          reject(new Error(`Invalid JSON format: ${(error as Error).message}`));
          return;
        }
      }

      if (!validateJaegerTrace(traceObj)) {
        reject(new Error('Invalid trace format. Expected Jaeger or OTLP trace format'));
        return;
      }

      if (isOTelSpan(traceObj)) {
        traceObj = convertOTelSpanToOTLP(traceObj);
      }

      if (Array.isArray(traceObj) && traceObj.every(obj => 'resourceSpans' in obj)) {
        const mergedResourceSpans = traceObj.reduce((acc, obj) => {
          acc.push(...obj.resourceSpans);
          return acc;
        }, []);

        traceObj = { resourceSpans: mergedResourceSpans };
      }

      if ('resourceSpans' in traceObj) {
        JaegerAPI.transformOTLP(traceObj)
          .then((result: string) => {
            resolve(result);
          })
          .catch(() => {
            reject(new Error('Error converting traces to Jaeger format'));
          });
      } else {
        resolve(traceObj);
      }
    };
    reader.onerror = () => {
      const errMessage = reader.error ? `: ${String(reader.error)}` : '';
      reject(new Error(`Error reading the JSON file${errMessage}`));
    };
    reader.onabort = () => {
      reject(new Error('Reading the JSON file has been aborted'));
    };
    try {
      reader.readAsText(fileList.file);
    } catch (error) {
      reject(new Error(`Error reading the JSON file: ${(error as Error).message}`));
    }
  });
}
