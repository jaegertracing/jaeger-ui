// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _uniq from 'lodash/uniq';
import memoize from 'lru-memoize';

import getConfig from '../utils/config/get-config';
import { encodedStringSupplant, getParamNames } from '../utils/stringSupplant';
import { getParameterAndFormatter } from '../utils/link-formatting';
import { TNil } from '../types';
import { Hyperlink } from '../types/hyperlink';
import { IOtelSpan, IOtelTrace, IAttribute, IAttributes } from '../types/otel';

type ProcessedTemplate = {
  parameters: string[];
  template: (template: { [key: string]: any }) => string;
};

const ENABLE_LEGACY_LINK_PATTERNS = true;

type LinkPatternType = 'attributes' | 'resource' | 'events' | 'traces';
type LegacyLinkPatternType = 'tags' | 'process' | 'logs';

const VALID_TRACE_KEYS = ['traceID', 'traceName', 'duration', 'startTime', 'endTime'];

const VALID_SPAN_KEYS = [
  'spanID',
  'traceID',
  'operationName',
  'name',
  'duration',
  'startTime',
  'endTime',
  'serviceName',
];

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

function getParameterInAttributes(name: string, attributes: IAttributes | undefined): IAttribute | undefined {
  const value = attributes?.getValue(name);
  return value === undefined ? undefined : { key: name, value };
}

export function getParameterInSpanIntrinsic(name: string, span: IOtelSpan): IAttribute | undefined {
  if (!VALID_SPAN_KEYS.includes(name)) {
    return undefined;
  }
  let value: any;
  switch (name) {
    case 'spanID':
      value = span.spanID;
      break;
    case 'traceID':
      value = span.traceID;
      break;
    case 'operationName':
    case 'name':
      value = span.name;
      break;
    case 'duration':
      value = span.duration;
      break;
    case 'startTime':
      value = span.startTime;
      break;
    case 'endTime':
      value = span.endTime;
      break;
    case 'serviceName':
      value = span.resource?.serviceName ?? span.resource?.attributes?.getValue('service.name');
      break;
    default:
      break;
  }
  return value !== undefined ? { key: name, value } : undefined;
}

export function getParameterInResource(name: string, span: IOtelSpan): IAttribute | undefined {
  if (name === 'serviceName' || name === 'service.name') {
    const serviceName = span.resource?.serviceName ?? span.resource?.attributes?.getValue('service.name');
    if (serviceName !== undefined) {
      return { key: name, value: serviceName };
    }
  }
  return getParameterInAttributes(name, span.resource?.attributes);
}

export function getParameterInSpan(name: string, span: IOtelSpan): IAttribute | undefined {
  return getParameterInSpanIntrinsic(name, span) || getParameterInAttributes(name, span.attributes);
}

export function getParameterInParent(name: string, span: IOtelSpan): IAttribute | undefined {
  const parent = span.parentSpan;
  if (!parent) {
    return undefined;
  }
  if (name.startsWith('resource.')) {
    return getParameterInResource(name.slice(9), parent);
  }
  if (name.startsWith('process.')) {
    return getParameterInResource(name.slice(8), parent);
  }
  if (name.startsWith('span.')) {
    return getParameterInSpan(name.slice(5), parent);
  }
  return (
    getParameterInSpanIntrinsic(name, parent) ||
    getParameterInAttributes(name, parent.attributes) ||
    getParameterInResource(name, parent)
  );
}

export function getParameterInAncestors(name: string, span: IOtelSpan): IAttribute | undefined {
  let currentSpan = span.parentSpan;
  while (currentSpan) {
    let result: IAttribute | undefined;
    if (name.startsWith('resource.')) {
      result = getParameterInResource(name.slice(9), currentSpan);
    } else if (name.startsWith('process.')) {
      result = getParameterInResource(name.slice(8), currentSpan);
    } else if (name.startsWith('span.')) {
      result = getParameterInSpan(name.slice(5), currentSpan);
    } else {
      result =
        getParameterInSpanIntrinsic(name, currentSpan) ||
        getParameterInAttributes(name, currentSpan.attributes) ||
        getParameterInResource(name, currentSpan);
    }
    if (result) {
      return result;
    }
    currentSpan = currentSpan.parentSpan;
  }
  return undefined;
}

export function getParameterInAncestor(name: string, span: IOtelSpan): IAttribute | undefined {
  let currentSpan: IOtelSpan | undefined = span;
  while (currentSpan) {
    const intrinsic = getParameterInSpanIntrinsic(name, currentSpan);
    if (intrinsic) {
      return intrinsic;
    }

    const result =
      getParameterInAttributes(name, currentSpan.attributes) ||
      getParameterInAttributes(name, currentSpan.resource?.attributes);
    if (result) {
      return result;
    }
    currentSpan = currentSpan.parentSpan;
  }

  return undefined;
}

export function getParameterInTrace(
  name: string,
  trace: IOtelTrace
): { key: string; value: any } | undefined {
  const key = name.startsWith('trace.') ? name.slice(6) : name;
  if (VALID_TRACE_KEYS.includes(key)) {
    let value: any;
    switch (key) {
      case 'traceID':
        value = trace.traceID;
        break;
      case 'traceName':
        value = trace.traceName;
        break;
      case 'duration':
        value = trace.duration;
        break;
      case 'startTime':
        value = trace.startTime;
        break;
      case 'endTime':
        value = trace.endTime;
        break;
      default:
        return undefined;
    }
    return { key, value };
  }

  return undefined;
}

export function resolveParameter(
  parameterName: string,
  span: IOtelSpan,
  items: IAttributes,
  type: LinkPatternType,
  trace?: IOtelTrace
): IAttribute | undefined {
  if (parameterName.startsWith('trace.')) {
    const subKey = parameterName.slice(6);
    let entry = trace ? getParameterInTrace(subKey, trace) : undefined;
    if (!entry) {
      entry =
        getParameterInAttributes(parameterName, items) ||
        getParameterInAttributes(parameterName, span.attributes);
    }
    return entry;
  }

  if (parameterName.startsWith('span.')) {
    const remainder = parameterName.slice(5);
    if (remainder.startsWith('process.')) {
      return getParameterInResource(remainder.slice(8), span);
    }
    if (remainder.startsWith('resource.')) {
      return getParameterInResource(remainder.slice(9), span);
    }
    if (remainder.startsWith('parent.')) {
      return getParameterInParent(remainder.slice(7), span);
    }
    if (remainder.startsWith('ancestor.')) {
      return getParameterInAncestors(remainder.slice(9), span);
    }
    let entry = getParameterInSpan(remainder, span);
    if (!entry) {
      entry = getParameterInAttributes(parameterName, items);
    }
    return entry;
  }

  if (parameterName.startsWith('process.')) {
    const subKey = parameterName.slice(8);
    let entry = getParameterInResource(subKey, span);
    if (!entry) {
      entry = getParameterInAttributes(parameterName, items);
    }
    return entry;
  }

  if (parameterName.startsWith('resource.')) {
    const subKey = parameterName.slice(9);
    let entry = getParameterInResource(subKey, span);
    if (!entry) {
      entry = getParameterInAttributes(parameterName, items);
    }
    return entry;
  }

  if (parameterName.startsWith('parent.')) {
    const remainder = parameterName.slice(7);
    let entry = getParameterInParent(remainder, span);
    if (!entry) {
      entry = getParameterInAttributes(parameterName, items);
    }
    return entry;
  }

  if (parameterName.startsWith('ancestor.')) {
    const remainder = parameterName.slice(9);
    let entry = getParameterInAncestors(remainder, span);
    if (!entry) {
      entry = getParameterInAttributes(parameterName, items);
    }
    return entry;
  }

  // Unqualified resolution with backward compatibility
  let entry = getParameterInAttributes(parameterName, items);

  if (!entry && type !== 'resource') {
    entry = getParameterInAncestor(parameterName, span);
  }

  if (!entry && type === 'resource') {
    if (parameterName === 'serviceName' || parameterName === 'service.name') {
      const serviceName = span.resource?.serviceName ?? span.resource?.attributes?.getValue('service.name');
      if (serviceName !== undefined) {
        entry = { key: parameterName, value: serviceName };
      }
    }
  }

  return entry;
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
          const formatted = formatFunction ? formatFunction(traceKV.value) : traceKV.value;
          parameterValues[parameterName] = formatted;
          parameterValues[parameter] = formatted;

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

// computeLinks generates {url, text} link pairs by applying link patterns
// to the element `itemIndex` of `items` array. The values for template
// variables used in the patterns are resolved using structured scopes
// (trace., span., process./resource., parent., ancestor.) or fallback
// to looking up first in `items`, then in `span.attributes` and
// `span.resource.attributes`, and then in ancestor spans recursively
// via `span.parentSpan`.
export function computeLinks(
  linkPatterns: ProcessedLinkPattern[],
  span: IOtelSpan,
  items: IAttributes,
  itemIndex: number,
  trace?: IOtelTrace
): Hyperlink[] {
  const item = items.entries()[itemIndex];
  let type: LinkPatternType = 'events';
  let legacyType: LegacyLinkPatternType = 'logs';

  if (span.resource?.attributes === items) {
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
        const { parameterName } = getParameterAndFormatter(parameter);
        const entry = resolveParameter(parameterName, span, items, type, trace);

        if (entry) {
          parameterValues[parameterName] = entry.value;
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
): (span: IOtelSpan, items: IAttributes, itemIndex: number, trace?: IOtelTrace) => Hyperlink[] {
  return (span: IOtelSpan, items: IAttributes, itemIndex: number, trace?: IOtelTrace) => {
    if (linkPatterns.length === 0) {
      return [];
    }
    const item = items.entries()[itemIndex];
    let result = cache.get(item);
    if (!result) {
      result = computeLinks(linkPatterns, span, items, itemIndex, trace);
      cache.set(item, result);
    }
    return result;
  };
}

export const processedLinks: ProcessedLinkPattern[] = (getConfig().linkPatterns || [])
  .map(processLinkPattern)
  .filter((link): link is ProcessedLinkPattern => Boolean(link));

export const getTraceLinks: (trace: IOtelTrace) => Hyperlink[] = memoize(10)((trace: IOtelTrace) => {
  return computeTraceLink(processedLinks, trace);
});

export default createGetLinks(processedLinks, new WeakMap());
