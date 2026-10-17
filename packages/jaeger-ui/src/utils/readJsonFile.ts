// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import JaegerAPI from '../api/jaeger';

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

const DEFAULT_CONVERT_ERROR_MESSAGE = 'Error converting traces to OTLP';

export function extractServerErrorMessage(err: unknown): string | null {
  if (!err) {
    return null;
  }
  const e = err as any;

  if (typeof e.response?.data?.errors?.[0]?.msg === 'string' && e.response.data.errors[0].msg.trim()) {
    return e.response.data.errors[0].msg.trim();
  }

  if (typeof e.response?.errors?.[0]?.msg === 'string' && e.response.errors[0].msg.trim()) {
    return e.response.errors[0].msg.trim();
  }

  if (typeof e.data?.errors?.[0]?.msg === 'string' && e.data.errors[0].msg.trim()) {
    return e.data.errors[0].msg.trim();
  }

  if (typeof e.errors?.[0]?.msg === 'string' && e.errors[0].msg.trim()) {
    return e.errors[0].msg.trim();
  }

  if (typeof e.httpBody === 'string') {
    try {
      const parsed = JSON.parse(e.httpBody);
      if (typeof parsed?.errors?.[0]?.msg === 'string' && parsed.errors[0].msg.trim()) {
        return parsed.errors[0].msg.trim();
      }
    } catch {
      // not JSON
    }
  }

  if (typeof e.message === 'string' && e.message.trim()) {
    const cleaned = e.message.replace(/^HTTP Error:\s*/, '').trim();
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

export function formatConvertErrorMessage(
  err: unknown,
  defaultMessage = DEFAULT_CONVERT_ERROR_MESSAGE
): string {
  const serverMsg = extractServerErrorMessage(err);
  if (!serverMsg) {
    return defaultMessage;
  }

  const legacyPrefix = 'Error converting OTLP trace to Jaeger: ';
  let normalizedMsg = serverMsg;
  if (normalizedMsg.startsWith(legacyPrefix)) {
    normalizedMsg = normalizedMsg.slice(legacyPrefix.length).trim();
  }

  if (!normalizedMsg || normalizedMsg === defaultMessage) {
    return defaultMessage;
  }

  if (normalizedMsg.startsWith(`${defaultMessage}:`)) {
    return normalizedMsg;
  }

  return `${defaultMessage}: ${normalizedMsg}`;
}

export default function readJsonFile(fileList: { file: File }): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Invalid result type'));
        return;
      }
      if (reader.result.trim() === '') {
        reject(new Error('The JSON file is empty'));
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
      if (
        Array.isArray(traceObj) &&
        traceObj.every(obj => obj !== null && typeof obj === 'object' && 'resourceSpans' in obj)
      ) {
        const mergedResourceSpans = traceObj.reduce((acc, obj) => {
          acc.push(...obj.resourceSpans);
          return acc;
        }, []);

        traceObj = { resourceSpans: mergedResourceSpans };
      }

      if (traceObj === null || typeof traceObj !== 'object') {
        reject(new Error('Invalid JSON trace format'));
        return;
      }

      if ('resourceSpans' in traceObj) {
        JaegerAPI.transformOTLP(traceObj)
          .then((result: any) => {
            if (
              result &&
              typeof result === 'object' &&
              Array.isArray(result.errors) &&
              result.errors.length > 0
            ) {
              const errorMessage = formatConvertErrorMessage(result);
              reject(new Error(errorMessage));
              return;
            }
            resolve(result);
          })
          .catch((err: unknown) => {
            const errorMessage = formatConvertErrorMessage(err);
            reject(new Error(errorMessage, { cause: err }));
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
