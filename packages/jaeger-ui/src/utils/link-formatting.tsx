// Copyright (c) 2020 The Jaeger Authors.
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

import { Trace } from '../types/trace';

function getFormatFunctions<T = Trace[keyof Trace]>(): Record<
  string,
  (value: T, ...args: string[]) => T | string | number
> {
  return {
    epoch_micros_to_date_iso: microsSinceEpoch => {
      if (typeof microsSinceEpoch !== 'number') {
        console.error('epoch_micros_to_date_iso can only operate on numbers, ignoring formatting', {
          value: microsSinceEpoch,
        });
        return microsSinceEpoch;
      }

      return new Date(microsSinceEpoch / 1000).toISOString();
    },
    pad_start: (value, desiredLengthString: string, padCharacter: string) => {
      if (typeof value !== 'string') {
        console.error('pad_start can only operate on strings, ignoring formatting', {
          value,
          desiredLength: desiredLengthString,
          padCharacter,
        });
        return value;
      }
      const desiredLength = parseInt(desiredLengthString, 10);
      if (Number.isNaN(desiredLength)) {
        console.error('pad_start needs a desired length as second argument, ignoring formatting', {
          value,
          desiredLength: desiredLengthString,
          padCharacter,
        });
      }

      return value.padStart(desiredLength, padCharacter);
    },

    add: (value, offsetString: string) => {
      if (typeof value !== 'number') {
        console.error('add can only operate on numbers, ignoring formatting', {
          value,
          offsetString,
        });
        return value;
      }

      const offset = parseInt(offsetString, 10);
      if (Number.isNaN(offset)) {
        console.error('add needs a valid offset in microseconds as second argument, ignoring formatting', {
          value,
          offsetString,
        });
        return value;
      }

      return value + offset;
    },
  };
}

export function getParameterAndFormatter<T = Trace[keyof Trace]>(
  parameter: string
): {
  parameterName: string;
  formatFunction: ((value: T) => T | string | number) | null;
} {
  const parts = parameter.split('|').map(part => part.trim());
  const parameterName = parts[0];
  if (parts.length === 1) return { parameterName, formatFunction: null };

  const [formatFunctionName, ...args] = parts[1].split(' ');

  const formatFunctions = getFormatFunctions<T>();

  const formatFunction = formatFunctions[formatFunctionName];
  if (!formatFunction) {
    console.error('Unrecognized format function name, ignoring formatting', {
      parameter,
      formatFunctionName,
      validValues: Object.keys(formatFunctions),
    });
  }

  return { parameterName, formatFunction: formatFunction ? val => formatFunction(val, ...args) : null };
}
