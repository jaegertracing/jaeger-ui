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

function isOTLPFormat(obj: any): boolean {
  return obj && typeof obj === 'object' && 'resourceSpans' in obj;
}

function isArrayOfOTLPFormat(arr: any[]): boolean {
  return Array.isArray(arr) && arr.length > 0 && arr.every((obj: any) => isOTLPFormat(obj));
}

function isJaegerCompatibleFormat(obj: any): boolean {
  return obj && typeof obj === 'object' && 'data' in obj && Array.isArray(obj.data);
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
          reject(error);
          return;
        }
      }
      if (!traceObj) {
        reject(new Error('Empty or invalid trace data'));
        return;
      }
      if (isArrayOfOTLPFormat(Array.isArray(traceObj) ? traceObj : [traceObj])) {
        try {
          const mergedResourceSpans = (Array.isArray(traceObj) ? traceObj : [traceObj]).reduce((acc: any[], obj: any) => {
            if (obj.resourceSpans && Array.isArray(obj.resourceSpans)) {
              acc.push(...obj.resourceSpans);
            }
            return acc;
          }, []);
          
          traceObj = { resourceSpans: mergedResourceSpans };
        } catch (error) {
          reject(new Error(`Error merging resourceSpans: ${(error as Error).message}`));
          return;
        }
      }
      
      if (isOTLPFormat(traceObj)) {
        JaegerAPI.transformOTLP(traceObj)
          .then((result: string) => {
            try {
              const parsedResult = JSON.parse(result);
              if (!isJaegerCompatibleFormat(parsedResult)) {
                reject(new Error('Transformed OTLP trace is not in a compatible format'));
                return;
              }
              resolve(result);
            } catch (error: any) {
              reject(new Error(`Invalid JSON returned from OTLP transformation: ${(error as Error).message}`));
            }
          })
          .catch((error: any) => {
            reject(new Error(`Error converting traces to OTLP: ${error instanceof Error ? error.message : String(error)}`));
          });
      } 
      else if (traceObj && typeof traceObj === 'object' && 'context' in traceObj && 'trace_id' in traceObj.context) {
        reject(new Error('Single span format detected. This format is not compatible with the viewer. Please provide a Jaeger-compatible trace format.'));
      }
      else if (isJaegerCompatibleFormat(traceObj)) {
        resolve(traceObj);
      } else {
        reject(new Error('Unrecognized trace format. The file must contain a Jaeger-compatible trace structure with a data array.'));
      }
    };
    reader.onerror = () => {
      const errMessage = reader.error ? `: ${String(reader.error)}` : '';
      reject(new Error(`Error reading the JSON file${errMessage}`));
    };
    reader.onabort = () => {
      reject(new Error(`Reading the JSON file has been aborted`));
    };
    try {
      reader.readAsText(fileList.file);
    } catch (error) {
      reject(new Error(`Error reading the JSON file: ${(error as Error).message}`));
    }
  });
}
