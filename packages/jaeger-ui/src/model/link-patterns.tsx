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
import { getParent } from './span';
import { TNil } from '../types';
import { Span, Link, KeyValuePair } from '../types/trace';
import pluckTruthy from '../utils/ts/pluckTruthy';

const parameterRegExp = /#\{([^{}]*)\}/g;

type ProcessedTemplate = {
  parameters: string[];
  template: (template: { [key: string]: any }) => string;
};

type ProcessedLinkPattern = {
  object: any;
  type: (link: string) => boolean;
  key: (link: string) => boolean;
  value: (value: any) => boolean;
  url: ProcessedTemplate;
  text: ProcessedTemplate;
  parameters: string[];
};

function getParamNames(str: string) {
  const names = new Set<string>();
  str.replace(parameterRegExp, (match, name) => {
    names.add(name);
    return match;
  });
  return Array.from(names);
}

function stringSupplant(str: string, encodeFn: (unencoded: any) => string, map: Record<string, any>) {
  return str.replace(parameterRegExp, (_, name) => {
    const value = map[name];
    return value == null ? '' : encodeFn(value);
  });
}

export function processTemplate(template: any, encodeFn: (unencoded: any) => string): ProcessedTemplate {
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

const identity = (a: any): typeof a => a;

export function processLinkPattern(pattern: any): ProcessedLinkPattern | TNil {
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

export function getParameterInArray(name: string, array: KeyValuePair[]) {
  if (array) {
    return array.find(entry => entry.key === name);
  }
  return undefined;
}

export function getParameterInAncestor(name: string, span: Span) {
  let currentSpan: Span | TNil = span;
  while (currentSpan) {
    const result =
      getParameterInArray(name, currentSpan.tags) || getParameterInArray(name, currentSpan.process.tags);
    if (result) {
      return result;
    }
    currentSpan = getParent(currentSpan);
  }
  return undefined;
}

function callTemplate(template: ProcessedTemplate, data: any) {
  return template.template(data);
}

function renderPattern(
  pattern: ProcessedLinkPattern,
  items: KeyValuePair[],
  findInAncestorsFn: (_: string) => KeyValuePair | undefined,
  onMissingFn: (_: string) => void
) {
  const parameterValues: Record<string, any> = {};
  const allParameters = pattern.parameters.every(parameter => {
    const entry = getParameterInArray(parameter, items) || findInAncestorsFn(parameter);
    if (entry) {
      parameterValues[parameter] = entry.value;
      return true;
    }
    onMissingFn(parameter);
    return false;
  });
  return (
    allParameters && {
      url: callTemplate(pattern.url, parameterValues),
      text: callTemplate(pattern.text, parameterValues),
    }
  );
}

export function computeLinks(
  linkPatterns: ProcessedLinkPattern[],
  span: Span,
  items: KeyValuePair[],
  itemIndex: number
): { url: string; text: string }[] {
  const item = items[itemIndex];
  let type = 'logs';
  const processTags = span.process.tags === items;
  if (processTags) {
    type = 'process';
  }
  const spanTags = span.tags === items;
  if (spanTags) {
    type = 'tags';
  }
  return pluckTruthy(
    linkPatterns.map(
      pattern =>
        pattern.type(type) &&
        pattern.key(item.key) &&
        pattern.value(item.value) &&
        renderPattern(
          pattern,
          items,
          parameter => {
            // do not look in ancestors for process tags because the same object may appear in different
            // places in the hierarchy and the cache in getLinks uses that object as a key
            return !processTags ? getParameterInAncestor(parameter, span) : undefined;
          },
          parameter => {
            // eslint-disable-next-line no-console
            console.warn(
              `Skipping link pattern, missing parameter ${parameter} for key ${item.key} in ${type}.`,
              pattern.object
            );
          }
        )
    )
  );
}

export function computeSingleTagPattern(pattern: String, span: Span) {
  const linkPattern = processLinkPattern({
    type: 'tags',
    url: '',
    text: pattern,
  });
  if (!linkPattern) {
    return false;
  }
  const link = renderPattern(linkPattern, span.tags, () => undefined, () => {});
  return link && link.text;
}

export function createGetLinks(linkPatterns: ProcessedLinkPattern[], cache: WeakMap<KeyValuePair, Link[]>) {
  return (span: Span, items: KeyValuePair[], itemIndex: number) => {
    if (linkPatterns.length === 0) {
      return [];
    }
    const item = items[itemIndex];
    let result = cache.get(item);
    if (!result) {
      result = computeLinks(linkPatterns, span, items, itemIndex);
      cache.set(item, result);
    }
    return result;
  };
}

export default createGetLinks(
  (getConfigValue('linkPatterns') || []).map(processLinkPattern).filter(Boolean),
  new WeakMap()
);
