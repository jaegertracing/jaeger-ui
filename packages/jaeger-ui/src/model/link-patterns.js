// @flow

// Copyright (c) 2017 The Jaeger Authors.
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

import _uniq from 'lodash/uniq';
import { getConfigValue } from '../utils/config/get-config';
import type { Span, Trace } from '../types';

const parameterRegExp = /\$\{([^{}]*)\}/g;

type ProcessedTemplate = {
  parameters: string[],
  template: (data: { [parameter: string]: any }) => string,
};

function getParamNames(str) {
  const names = [];
  str.replace(parameterRegExp, (match, name) => {
    names.push(name);
    return match;
  });
  return _uniq(names);
}

function stringSupplant(str, encodeFn: any => string, map) {
  return str.replace(parameterRegExp, (_, name) => encodeFn(map[name]));
}

export function processTemplate(template: any, encodeFn: any => string): ProcessedTemplate {
  if (typeof template !== 'string') {
    /*

    // kept on ice until #123 is implemented:
    if (template && Array.isArray(template.parameters) && (typeof template.template === 'function')) {
      return template;
    }

    */
    throw new Error('Invalid template');
  }
  return {
    parameters: getParamNames(template),
    template: stringSupplant.bind(null, template, encodeFn),
  };
}

export function createTestFunction(entry: any) {
  if (typeof entry === 'string') {
    return (arg: any) => arg === entry;
  }
  if (Array.isArray(entry)) {
    return (arg: any) => entry.indexOf(arg) > -1;
  }
  /*

  // kept on ice until #123 is implemented:
  if (entry instanceof RegExp) {
    return (arg: any) => entry.test(arg);
  }
  if (typeof entry === 'function') {
    return entry;
  }

  */
  if (entry == null) {
    return () => true;
  }
  throw new Error(`Invalid value: ${entry}`);
}

const identity = a => a;

type ProcessedLinkPattern = {
  object: any,
  type: string => boolean,
  key: string => boolean,
  value: any => boolean,
  url: ProcessedTemplate,
  text: ProcessedTemplate,
  parameters: string[],
};

export function processLinkPattern(pattern: any): ?ProcessedLinkPattern {
  try {
    const url = processTemplate(pattern.url, encodeURIComponent);
    const text = processTemplate(pattern.text, identity);
    return {
      object: pattern,
      type: createTestFunction(pattern.type),
      key: createTestFunction(pattern.key),
      value: createTestFunction(pattern.value),
      url,
      text,
      parameters: _uniq(url.parameters.concat(text.parameters)),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Ignoring invalid link pattern: ${error}`, pattern);
    return null;
  }
}

export function getParameterInArray(name: string, array: { key: string, value: any }[]) {
  if (array) {
    return array.find(entry => entry.key === name);
  }
  return undefined;
}

export function getParameterInAncestor(name: string, spans: Span[], startSpanIndex: number) {
  let currentSpan = { depth: spans[startSpanIndex].depth + 1 };
  for (let spanIndex = startSpanIndex; spanIndex >= 0 && currentSpan.depth > 0; spanIndex--) {
    const nextSpan = spans[spanIndex];
    if (nextSpan.depth < currentSpan.depth) {
      currentSpan = nextSpan;
      const result =
        getParameterInArray(name, currentSpan.tags) || getParameterInArray(name, currentSpan.process.tags);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

function callTemplate(template, data) {
  return template.template(data);
}

export function computeLinks(
  linkPatterns: ProcessedLinkPattern[],
  trace: Trace,
  spanIndex: number,
  items: { key: string, value: any }[],
  itemIndex: number
) {
  const item = items[itemIndex];
  const span = trace.spans[spanIndex];
  let type = 'logs';
  const processTags = span.process.tags === items;
  if (processTags) {
    type = 'process';
  }
  const spanTags = span.tags === items;
  if (spanTags) {
    type = 'tags';
  }
  const result = [];
  linkPatterns.forEach(pattern => {
    if (pattern.type(type) && pattern.key(item.key) && pattern.value(item.value)) {
      let parameterValues = {};
      pattern.parameters.every(parameter => {
        let entry = getParameterInArray(parameter, items);
        if (!entry && !processTags) {
          // do not look in ancestors for process tags because the same object may appear in different places in the hierarchy
          // and the cache in getLinks uses that object as a key
          entry = getParameterInAncestor(parameter, trace.spans, spanIndex);
        }
        if (entry && parameterValues) {
          parameterValues[parameter] = entry.value;
          return true;
        }
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping link pattern, missing parameter ${parameter} for key ${item.key} in ${type}.`,
          pattern.object
        );
        parameterValues = null;
        return false;
      });
      if (parameterValues) {
        result.push({
          url: callTemplate(pattern.url, parameterValues),
          text: callTemplate(pattern.text, parameterValues),
        });
      }
    }
  });
  return result;
}

export function createGetLinks(
  linkPatterns: ProcessedLinkPattern[],
  cache: WeakMap<{ key: string, value: any }, { url: string, text: string }[]>
) {
  return (trace: Trace, spanIndex: number, items: { key: string, value: any }[], itemIndex: number) => {
    if (linkPatterns.length === 0) {
      return [];
    }
    const item = items[itemIndex];
    let result = cache.get(item);
    if (!result) {
      result = computeLinks(linkPatterns, trace, spanIndex, items, itemIndex);
      cache.set(item, result);
    }
    return result;
  };
}

export default createGetLinks(
  (getConfigValue('linkPatterns') || []).map(processLinkPattern).filter(Boolean),
  new WeakMap()
);
