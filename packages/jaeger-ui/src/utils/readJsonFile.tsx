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

export default function readJsonFile(fileList: { file: File }): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Invalid result type'));
        return;
      }
      try {
        const resourceSpansArray: any[] = [];
        let combinedTraceObj: { resourceSpans: any[] } = { resourceSpans: [] };

        try {
          // Attempt to parse the entire content as a single JSON object
          const traceObj = JSON.parse(reader.result);
          if ('resourceSpans' in traceObj) {
            resourceSpansArray.push(...traceObj.resourceSpans);
          } else {
            resolve(traceObj);
          }
        } catch (error) {
          // If parsing fails, handle multi-line JSON objects
          const jsonStrings = reader.result.split('\n').filter(line => line.trim() !== '');
          jsonStrings.forEach(jsonString => {
            try {
              const traceObj = JSON.parse(jsonString.trim());
              if ('resourceSpans' in traceObj) {
                resourceSpansArray.push(...traceObj.resourceSpans);
              }
            } catch (error) {
              throw new Error(`Error parsing JSON: ${(error as Error).message}`);
            }
          });
        }

        combinedTraceObj = { resourceSpans: resourceSpansArray };

        JaegerAPI.transformOTLP(combinedTraceObj)
          .then((result: string) => {
            resolve(result);
          })
          .catch(() => {
            reject(new Error('Error converting traces to OTLP'));
          });
      } catch (error) {
        reject(new Error(`Error processing JSON: ${(error as Error).message}`));
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
