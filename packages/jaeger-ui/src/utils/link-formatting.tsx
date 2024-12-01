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

const formatFunctions: Record<
  string,
  <T extends Trace[keyof Trace]>(value: T, ...args: string[]) => T | string | number
> = {
  epoch_micros_to_date_iso: microsSinceEpoch => {
    if (typeof microsSinceEpoch !== 'number') {
      console.error('epoch_micros_to_date_iso() can only operate on numbers, ignoring formatting', {
        value: microsSinceEpoch,
      });
      return microsSinceEpoch;
    }

    return new Date(microsSinceEpoch / 1000).toISOString();
  },
  pad_start: (value, desiredLengthString: string, padCharacter: string) => {
    if (typeof value !== 'string') {
      console.error('pad_start() can only operate on strings, ignoring formatting', {
        value,
        desiredLength: desiredLengthString,
        padCharacter,
      });
      return value;
    }
    const desiredLength = parseInt(desiredLengthString, 10);
    if (Number.isNaN(desiredLength)) {
      console.error('pad_start() needs a desired length as second argument, ignoring formatting', {
        value,
        desiredLength: desiredLengthString,
        padCharacter,
      });
    }

    return value.padStart(desiredLength, padCharacter);
  },

  add: (value, offsetString: string) => {
    if (typeof value !== 'number') {
      console.error('add() needs a numeric offset as an argument, ignoring formatting', {
        value,
        offsetString,
      });
      return value;
    }

    const offset = parseInt(offsetString, 10);
    if (Number.isNaN(offset)) {
      console.error('add() needs a valid offset in microseconds as second argument, ignoring formatting', {
        value,
        offsetString,
      });
      return value;
    }

    return value + offset;
  },
};

export function getParameterAndFormatter<T = Trace[keyof Trace]>(
  parameter: string
): {
  parameterName: string;
  formatFunction: ((value: T) => T | string | number) | null;
} {
  const [parameterName, ...formatStrings] = parameter.split('|').map(part => part.trim());

  // const formatFunctions = getFormatFunctions<T>();

  const formatters = formatStrings
    .map(formatString => {
      const [formatFunctionName, ...args] = formatString.split(/ +/);
      const formatFunction = formatFunctions[formatFunctionName] as
        | ((value: T, ...args: string[]) => T | string | number)
        | undefined;
      if (!formatFunction) {
        console.error(
          'Unrecognized format function name, ignoring formatting. Other formatting functions may be applied',
          {
            parameter,
            formatFunctionName,
            validValues: Object.keys(formatFunctions),
          }
        );
        return null;
      }
      return (val: T) => formatFunction(val, ...args);
    })
    .filter((fn): fn is NonNullable<typeof fn> => fn != null);

  const chainedFormatFunction = (value: T) => formatters.reduce((acc, fn) => fn(acc) as T, value);

  return {
    parameterName,
    formatFunction: formatters.length ? chainedFormatFunction : null,
  };
}
