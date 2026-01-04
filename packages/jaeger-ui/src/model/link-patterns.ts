// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _uniq from 'lodash/uniq';
import memoize from 'lru-memoize';

import { getConfigValue } from '../utils/config/get-config';
import { encodedStringSupplant, getParamNames } from '../utils/stringSupplant';
import { getParameterAndFormatter } from '../utils/link-formatting';
import { TNil } from '../types';
import { Hyperlink } from '../types/hyperlink';
import { IOtelSpan, IOtelTrace, IAttribute } from '../types/otel';

type ProcessedTemplate = {
  parameters: string[];
  template: (template: { [key: string]: any }) => string;
};

const ENABLE_LEGACY_LINK_PATTERNS = true;

type LinkPatternType = 'attributes' | 'resource' | 'events' | 'traces';
type LegacyLinkPatternType = 'tags' | 'process' | 'logs';

type ProcessedLinkPattern = {
  object: any;
  type: (link: LinkPatternType | LegacyLinkPatternType) => boolean;
  key: (link: string) => boolean;
  value: (value: any) => boolean;
  url: ProcessedTemplate;
  text: ProcessedTemplate;
  parameters: string[];
};

export function processTemplate(template: any, encodeFn: (unencoded: any) => string): ProcessedTemplate {
  if (typeof template !== 'string') {
    if (template && Array.isArray(template.parameters) && typeof template.template === 'function') {
      return template;
    }

    throw new Error('Invalid template');
  }
  return {
    parameters: getParamNames(template),
    template: encodedStringSupplant.bind(null, template, encodeFn),
  };
}

export function createTestFunction(entry: any): (arg: any) => boolean {
  if (typeof entry === 'string') {
    return (arg: any) => arg === entry;
  }
  if (Array.isArray(entry)) {
    return (arg: any) => entry.indexOf(arg) > -1;
  }
  if (entry instanceof RegExp) {
    return (arg: any) => entry.test(arg);
  }
  if (typeof entry === 'function') {
    return entry;
  }
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
    console.error(`Ignoring invalid link pattern: ${error}`, pattern);
    return null;
  }
}

export function getParameterInArray(name: string, array: ReadonlyArray<IAttribute>): IAttribute | undefined {
  if (array) {
    return array.find(entry => entry.key === name);
  }
  return undefined;
}

export function getParameterInAncestor(name: string, span: IOtelSpan): IAttribute | undefined {
  let currentSpan: IOtelSpan | undefined = span;
  while (currentSpan) {
    const result =
      getParameterInArray(name, currentSpan.attributes) ||
      getParameterInArray(name, currentSpan.resource.attributes);
    if (result) {
      return result;
    }
    currentSpan = currentSpan.parentSpan;
  }

  return undefined;
}

const getValidTraceKeys = memoize(10)((trace: IOtelTrace) => {
  const validKeys = (Object.keys(trace) as (keyof IOtelTrace)[]).filter(
    key => typeof trace[key] === 'string' || typeof trace[key] === 'number'
  );
  return validKeys;
});

export function getParameterInTrace(
  name: string,
  trace: IOtelTrace | undefined
): { key: keyof IOtelTrace; value: any } | undefined {
  if (trace) {
    const validTraceKeys = getValidTraceKeys(trace);

    const key = name as keyof IOtelTrace;
    if (validTraceKeys.includes(key)) {
      return { key, value: trace[key] };
    }
  }

  return undefined;
}

function callTemplate(template: ProcessedTemplate, data: any): string {
  return template.template(data);
}

export function computeTraceLink(linkPatterns: ProcessedLinkPattern[], trace: IOtelTrace): Hyperlink[] {
  const result: Hyperlink[] = [];

  linkPatterns
    .filter(pattern => pattern.type('traces'))
    .forEach(pattern => {
      const parameterValues: Record<string, any> = {};
      const allParameters = pattern.parameters.every(parameter => {
        const { parameterName, formatFunction } = getParameterAndFormatter(parameter);
        const traceKV = getParameterInTrace(parameterName, trace);

        if (traceKV) {
          // At this point is safe to access to trace object using parameter variable because
          // we validated parameter against validKeys, this implies that parameter a keyof IOtelTrace.
          parameterValues[parameterName] = formatFunction ? formatFunction(traceKV.value) : traceKV.value;

          return true;
        }
        return false;
      });

      if (allParameters) {
        result.push({
          url: callTemplate(pattern.url, parameterValues),
          text: callTemplate(pattern.text, parameterValues),
        });
      }
    });

  return result;
}

// computeLinks generates {url, text} link pairs by applying link patterms
// to the element `itemIndex` of `items` array. The values for template
// variables used in the patterns are looked up first in `items`, then
// in `span.attributes` and `span.resource.attributes`, and then in ancestor spans
// recursively via `span.parentSpan`.
export function computeLinks(
  linkPatterns: ProcessedLinkPattern[],
  span: IOtelSpan,
  items: ReadonlyArray<IAttribute>,
  itemIndex: number,
  trace: IOtelTrace | undefined
): Hyperlink[] {
  const item = items[itemIndex];
  let type: LinkPatternType = 'events';
  let legacyType: LegacyLinkPatternType = 'logs';

  if (span.resource.attributes === items) {
    type = 'resource';
    legacyType = 'process';
  } else if (span.attributes === items) {
    type = 'attributes';
    legacyType = 'tags';
  }

  const result: Hyperlink[] = [];
  linkPatterns.forEach(pattern => {
    let typeMatches = pattern.type(type);
    if (!typeMatches && ENABLE_LEGACY_LINK_PATTERNS) {
      typeMatches = pattern.type(legacyType);
    }

    if (typeMatches && pattern.key(item.key) && pattern.value(item.value)) {
      const parameterValues: Record<string, any> = {};
      const allParameters = pattern.parameters.every(parameter => {
        let entry;

        if (parameter.startsWith('trace.')) {
          entry = getParameterInTrace(parameter.split('trace.')[1], trace);
        } else {
          entry = getParameterInArray(parameter, items);

          if (!entry && type !== 'resource') {
            // do not look in ancestors for resource attributes because the same object may appear in different places in the hierarchy
            // and the cache in getLinks uses that object as a key
            entry = getParameterInAncestor(parameter, span);
          }
        }

        if (entry) {
          parameterValues[parameter] = entry.value;
          return true;
        }

        console.warn(
          `Skipping link pattern, missing parameter ${parameter} for key ${item.key} in ${type}.`,
          pattern.object
        );
        return false;
      });
      if (allParameters) {
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
  cache: WeakMap<IAttribute, Hyperlink[]>
): (
  span: IOtelSpan,
  items: ReadonlyArray<IAttribute>,
  itemIndex: number,
  trace: IOtelTrace | undefined
) => Hyperlink[] {
  return (
    span: IOtelSpan,
    items: ReadonlyArray<IAttribute>,
    itemIndex: number,
    trace: IOtelTrace | undefined
  ) => {
    if (linkPatterns.length === 0) {
      return [];
    }
    const item = items[itemIndex];
    let result = cache.get(item);
    if (!result) {
      result = computeLinks(linkPatterns, span, items, itemIndex, trace);
      cache.set(item, result);
    }
    return result;
  };
}

export const processedLinks: ProcessedLinkPattern[] = (getConfigValue('linkPatterns') || [])
  .map(processLinkPattern)
  .filter(Boolean);

export const getTraceLinks: (trace: IOtelTrace | undefined) => Hyperlink[] = memoize(10)((
  trace: IOtelTrace | undefined
) => {
  const result: Hyperlink[] = [];
  if (!trace) return result;
  return computeTraceLink(processedLinks, trace);
});

export default createGetLinks(processedLinks, new WeakMap());
