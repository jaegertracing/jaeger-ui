// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import JaegerAPI from '../api/jaeger';

// Distinguishes "the OTLP-to-Jaeger backend conversion failed" from every other
// rejection readJsonFile can produce (malformed JSON, a bad FileReader result, etc).
// Unlike those, this file's JSON was valid - the failure happened after parsing,
// in the network call to POST /api/transform, so callers should not describe it
// as a parse error.
export class OtlpTransformError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OtlpTransformError';
  }
}

function tryParseMultiLineInput(input: string): any[] {
  const jsonStrings = input.split('\n').filter((line: string) => line.trim() !== '');
  const parsedObjects: any[] = [];

  jsonStrings.forEach((jsonString: string, index: number) => {
    try {
      const traceObj = JSON.parse(jsonString.trim());
      parsedObjects.push(traceObj);
    } catch (error) {
      throw new Error(`Error parsing JSON at line ${index + 1}: ${(error as Error).message}`, {
        cause: error,
      });
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
      } catch {
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
          .catch((err: unknown) => {
            const cause = err instanceof Error ? `: ${err.message}` : '';
            reject(
              new OtlpTransformError(
                `OTLP import requires a reachable Jaeger backend (POST /api/transform)${cause}`,
                { cause: err }
              )
            );
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
