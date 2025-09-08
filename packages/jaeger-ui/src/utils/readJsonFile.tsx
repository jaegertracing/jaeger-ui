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
            reject(new Error('Error converting traces to OTLP'));
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
      reject(new Error(`Reading the JSON file has been aborted`));
    };
    try {
      reader.readAsText(fileList.file);
    } catch (error) {
      reject(new Error(`Error reading the JSON file: ${(error as Error).message}`));
    }
  });
}
