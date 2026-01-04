// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Formatters that can be used in link patterns.
 *
 * @property epoch_micros_to_date_iso - Converts epoch microseconds to ISO 8601 date string.
 * @property pad_start - Pads the start of a string with a given character to a specified length.
 * @property add - Adds a numeric offset to a number.
 */
const formatFunctions: Record<string, <T>(value: T, ...args: string[]) => T | string | number> = {
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

/**
 * Parses a parameter string that may contain formatters (e.g. "param | formatter1 | formatter2 arg1").
 * Returns the parameter name and a chained function that applies all specified formatters.
 *
 * @param parameter - The parameter string to parse.
 * @returns An object containing the parameter name and the formatting function (or null if no formatters).
 */
export function getParameterAndFormatter<T = any>(
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
