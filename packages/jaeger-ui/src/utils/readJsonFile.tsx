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

/**
 * Validates OTLP trace data for common issues that would cause server-side errors
 * @param traceObj The trace object to validate
 * @returns An error message if validation fails, or null if validation passes
 */
export function validateOtlpTrace(traceObj: any): string | null {
  if (!traceObj || !traceObj.resourceSpans) return null;
  
  // Function to check for negative droppedAttributesCount values
  const checkForNegativeDroppedCounts = (obj: any): string | null => {
    if (!obj) return null;
    
    // Check direct droppedAttributesCount property
    if (obj.droppedAttributesCount !== undefined && obj.droppedAttributesCount < 0) {
      return `Found negative value (${obj.droppedAttributesCount}) for 'droppedAttributesCount' which should be a non-negative integer according to the OTLP specification.`;
    }
    
    // Check other dropped count properties
    const droppedCountProps = [
      'droppedEventsCount',
      'droppedLinksCount',
      'droppedAttributesCount',
      'droppedAnnotationsCount'
    ];
    
    for (const prop of droppedCountProps) {
      if (obj[prop] !== undefined && obj[prop] < 0) {
        return `Found negative value (${obj[prop]}) for '${prop}' which should be a non-negative integer according to the OTLP specification.`;
      }
    }
    
    return null;
  };
  
  // Recursive function to traverse the object structure
  const traverseAndCheck = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    
    // Check the current object
    const error = checkForNegativeDroppedCounts(obj);
    if (error) return error;
    
    // Check arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = traverseAndCheck(obj[i]);
        if (result) return result;
      }
    } else {
      // Check object properties
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'object') {
          const result = traverseAndCheck(obj[key]);
          if (result) return result;
        }
      }
    }
    
    return null;
  };
  
  return traverseAndCheck(traceObj);
}

/**
 * Attempts to fix common issues in OTLP trace data that would cause server-side errors
 * @param traceObj The trace object to fix
 * @returns A new trace object with fixes applied
 */
export function fixOtlpTraceIssues(traceObj: any): any {
  if (!traceObj || !traceObj.resourceSpans) return traceObj;
  
  // Create a deep copy to avoid modifying the original object
  const fixedTrace = JSON.parse(JSON.stringify(traceObj));
  
  // Function to fix negative dropped counts
  const fixNegativeDroppedCounts = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    
    // Fix all dropped count properties
    const droppedCountProps = [
      'droppedAttributesCount',
      'droppedEventsCount',
      'droppedLinksCount',
      'droppedAnnotationsCount'
    ];
    
    for (const prop of droppedCountProps) {
      if (obj[prop] !== undefined && obj[prop] < 0) {
        obj[prop] = 0; // Replace negative values with 0
      }
    }
    
    // Recursively fix nested objects
    if (Array.isArray(obj)) {
      obj.forEach(item => fixNegativeDroppedCounts(item));
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'object') {
          fixNegativeDroppedCounts(obj[key]);
        }
      }
    }
  };
  
  fixNegativeDroppedCounts(fixedTrace);
  return fixedTrace;
}

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
        // Validate the OTLP trace data before sending to the server
        const validationError = validateOtlpTrace(traceObj);
        if (validationError) {
          // Automatically fix the issues
          const fixedTraceObj = fixOtlpTraceIssues(traceObj);
          
          // Proceed with the fixed trace data
          JaegerAPI.transformOTLP(fixedTraceObj)
            .then((result: string) => {
              // Add a notification that the trace was automatically fixed
              console.info('Automatically fixed negative droppedAttributesCount values in OTLP trace data');
              resolve(result);
            })
            .catch((error) => {
              // If we still get an error after fixing, provide the detailed error message
              let errorMessage = `Validation Error: ${validationError}\n\nAn attempt was made to automatically fix the issues, but the server still returned an error.`;
              
              if (error && error.message) {
                if (error.message.startsWith('HTTP Error:')) {
                  errorMessage += `\n\nServer error: ${error.message.substring('HTTP Error:'.length).trim()}`;
                } else {
                  errorMessage += `\n\nServer error: ${error.message}`;
                }
              }
              
              reject(new Error(errorMessage));
            });
          return;
        }
        
        JaegerAPI.transformOTLP(traceObj)
          .then((result: string) => {
            resolve(result);
          })
          .catch((error) => {
            // Extract the detailed error message from the server response
            let errorMessage = 'Error converting traces to OTLP';
            
            if (error && error.message) {
              // Check if the error contains the HTTP Error prefix
              if (error.message.startsWith('HTTP Error:')) {
                errorMessage = error.message.substring('HTTP Error:'.length).trim();
              } else {
                errorMessage = error.message;
              }
              
              // If the error contains information about invalid unsigned integers (like droppedAttributesCount),
              // provide a more helpful message
              if (errorMessage.includes('readUint32') && errorMessage.includes('droppedAttributesCount')) {
                errorMessage = `${errorMessage}\n\nThis error often occurs when 'droppedAttributesCount' has a negative value, which is invalid according to the OTLP specification. Please check your trace data.`;
              }
            }
            
            reject(new Error(errorMessage));
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
