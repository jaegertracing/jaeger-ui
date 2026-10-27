// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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

export default function readJsonFile(fileList: { file: File }): Promise<unknown> {
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
      if (traceObj === null || typeof traceObj !== 'object') {
        reject(new Error('Invalid JSON trace format'));
        return;
      }

      resolve(traceObj);
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
