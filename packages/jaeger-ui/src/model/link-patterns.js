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

const parameterRegExp = /\$\{([^{}]*)\}/;

export function processTemplate(template, encodeFn) {
  if (typeof template !== 'string') {
    if (!template || !Array.isArray(template.parameters) || !(template.template instanceof Function)) {
      throw new Error('Invalid template');
    }
    return template;
  }
  const templateSplit = template.split(parameterRegExp);
  const templateSplitLength = templateSplit.length;
  const parameters = [];
  // odd indexes contain variable names
  for (let i = 1; i < templateSplitLength; i += 2) {
    const param = templateSplit[i];
    let paramIndex = parameters.indexOf(param);
    if (paramIndex === -1) {
      paramIndex = parameters.length;
      parameters.push(param);
    }
    templateSplit[i] = paramIndex;
  }
  return {
    parameters,
    template: (...args) => {
      let text = '';
      for (let i = 0; i < templateSplitLength; i++) {
        if (i % 2 === 0) {
          text += templateSplit[i];
        } else {
          text += encodeFn(args[templateSplit[i]]);
        }
      }
      return text;
    },
  };
}

export function createTestFunction(entry) {
  if (typeof entry === 'string') {
    return arg => arg === entry;
  }
  if (Array.isArray(entry)) {
    return arg => entry.indexOf(arg) > -1;
  }
  if (entry instanceof RegExp) {
    return arg => entry.test(arg);
  }
  if (entry instanceof Function) {
    return entry;
  }
  if (!entry) {
    return () => true;
  }
  throw new Error(`Invalid value: ${entry}`);
}

const identity = a => a;

export function processLinkPattern(pattern) {
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

export function getParameterInArray(name, array) {
  if (array) {
    return array.find(entry => entry.key === name);
  }
  return null;
}

export function getParameterInAncestor(name, spans, startSpanIndex) {
  let currentSpan = { depth: spans[startSpanIndex].depth + 1 };
  for (let spanIndex = startSpanIndex; spanIndex >= 0; spanIndex--) {
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
  return null;
}

export function callTemplate(template, data) {
  return template.template(...template.parameters.map(param => data[param]));
}

export function computeLinks(linkPatterns, trace, spanIndex, items, itemIndex) {
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
    if (pattern.type(type) && pattern.key(item.key, item.value, type) && pattern.value(item.value)) {
      let parameterValues = {};
      pattern.parameters.every(parameter => {
        let entry = getParameterInArray(parameter, items);
        if (!entry && !processTags) {
          // do not look in ancestors for process tags because the same object may appear in different places in the hierarchy
          entry = getParameterInAncestor(parameter, trace.spans, spanIndex);
        }
        if (entry) {
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

const linkPatterns = (getConfigValue('linkPatterns') || []).map(processLinkPattern).filter(value => !!value);
const alreadyComputed = new WeakMap();

export default function getLinks(trace, spanIndex, items, itemIndex) {
  if (linkPatterns.length === 0) {
    return [];
  }
  const item = items[itemIndex];
  let result = alreadyComputed.get(item);
  if (!result) {
    result = computeLinks(linkPatterns, trace, spanIndex, items, itemIndex);
    alreadyComputed.set(item, result);
  }
  return result;
}
