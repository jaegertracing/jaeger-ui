// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This module is the criterion vocabulary of RFC 0009. A criterion is a predicate over one span,
// a clause applies a verb (keep, hide) to a criterion, and a span filter is the clause
// list plus the tree mode that decides what happens to the children of a hidden span. The
// timeline consumes the evaluation result as sets of span IDs, so that the row generation, the
// critical path and the search match count do not need to know which clause hid or found a span.
// The result is derived from the trace at hand rather than stored, so a caller that holds a
// different or newer trace than the timeline never sees a stale set. The module also holds the
// `f=` URL codec; the `svcFilter` codec stays in url/svcFilter.ts.

import { TNil } from '../../types';
import { IAttribute, IOtelSpan } from '../../types/otel';
import memoizeOne from 'memoize-one';
import filterSpans, { stringifyAttributeValue } from '../../utils/filter-spans';
import { getGenAiTokenUsage } from './TraceTimelineViewer/SpanDetail/GenAITab/genAiData';
import { isErrorSpan } from './TraceTimelineViewer/utils';

type SetProperty = 'service' | 'status' | 'kind' | 'spanType';
type RangeProperty = 'duration' | 'tokens';

type Criterion =
  | { shape: 'text'; text: string }
  | { shape: 'set'; property: SetProperty; values: ReadonlyArray<string> }
  | { shape: 'range'; property: RangeProperty; min: number; max: number }
  | { shape: 'attr'; text: string };

type Verb = 'keep' | 'hide';

export interface IClause {
  verb: Verb;
  criterion: Criterion;
}

type TreeMode = 'remove' | 'lift';

export interface ISpanFilter {
  clauses: ReadonlyArray<IClause>;
  treeMode: TreeMode;
}

export const EMPTY_SPAN_FILTER: ISpanFilter = { clauses: [], treeMode: 'remove' };

/** The span type value of a span that carries no gen_ai attributes. */
const NON_GENAI_SPAN_TYPE = 'none';

const STATUS_ERROR = 'error';
const STATUS_OK = 'ok';

function spanPropertyValue(span: IOtelSpan, property: SetProperty): string {
  switch (property) {
    case 'service':
      return span.resource.serviceName;
    case 'status':
      return isErrorSpan(span) ? STATUS_ERROR : STATUS_OK;
    case 'kind':
      return span.kind.toLowerCase();
    case 'spanType':
      return (span.genAIKind ?? NON_GENAI_SPAN_TYPE).toLowerCase();
  }
}

// Tokens are the input plus output tokens as the GenAI tab reads them, so that the cache and
// modality breakdowns of those totals are not counted twice.
function spanRangeValue(span: IOtelSpan, property: RangeProperty): number {
  if (property === 'duration') return span.duration;
  const usage = getGenAiTokenUsage(span.attributes);
  return (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
}

function attributeText({ key, value }: IAttribute): string {
  return `${key}:${stringifyAttributeValue(value)}`.toLowerCase();
}

// The attribute criterion matches when `key:value` is a substring of the `key:value` text of a
// span attribute or a resource attribute; a bare key or a bare value therefore matches too. An
// attribute without a value is skipped, as filterSpans skips it.
function matchesAttribute(span: IOtelSpan, needle: string): boolean {
  if (!needle) return false;
  const matches = (kv: IAttribute) => kv.value != null && attributeText(kv).includes(needle);
  return span.attributes.entries().some(matches) || span.resource.attributes.entries().some(matches);
}

type Predicate = (span: IOtelSpan) => boolean;

// Compiles a criterion into a predicate. The text criterion is filterSpans, which works on the
// whole list, so it is evaluated once here and the predicate is a set lookup.
function compileCriterion(criterion: Criterion, spans: ReadonlyArray<IOtelSpan>): Predicate {
  switch (criterion.shape) {
    case 'text': {
      const ids = filterSpans(criterion.text, spans) ?? new Set<string>();
      return span => ids.has(span.spanID);
    }
    case 'set': {
      // Every property except the service name compares lower-cased, so that a URL may spell a
      // kind, a status or a span type either way.
      const values = new Set(
        criterion.property === 'service' ? criterion.values : criterion.values.map(v => v.toLowerCase())
      );
      return span => values.has(spanPropertyValue(span, criterion.property));
    }
    case 'range':
      return span => {
        const v = spanRangeValue(span, criterion.property);
        return v >= criterion.min && v <= criterion.max;
      };
    case 'attr': {
      const needle = criterion.text.toLowerCase();
      return span => matchesAttribute(span, needle);
    }
  }
}

export interface ISpanFilterResult {
  // Every span the filter hides. In remove mode this includes the descendants of a hidden span.
  hiddenIDs: ReadonlySet<string>;
}

// Returned whenever nothing is filtered, so that consumers memoized on the set do not re-render.
const EMPTY_RESULT: ISpanFilterResult = { hiddenIDs: new Set() };

function evaluate(spans: ReadonlyArray<IOtelSpan> | TNil, filter: ISpanFilter): ISpanFilterResult {
  if (!spans || filter.clauses.length === 0) return EMPTY_RESULT;
  const keeps: Predicate[] = [];
  const hides: Predicate[] = [];
  for (const clause of filter.clauses) {
    const predicate = compileCriterion(clause.criterion, spans);
    if (clause.verb === 'keep') keeps.push(predicate);
    else hides.push(predicate);
  }
  const removeMode = filter.treeMode === 'remove';
  const hiddenIDs = new Set<string>();
  for (const span of spans) {
    const parentHidden = removeMode && span.parentSpan ? hiddenIDs.has(span.parentSpan.spanID) : false;
    const visible = !parentHidden && keeps.every(p => p(span)) && !hides.some(p => p(span));
    if (!visible) hiddenIDs.add(span.spanID);
  }
  // A filter that hides nothing shares the empty set, so the row and critical-path memos keyed on
  // the hidden IDs stay valid.
  return hiddenIDs.size ? { hiddenIDs } : EMPTY_RESULT;
}

/**
 * Evaluates the filter over the spans. A span is visible when it matches every keep clause and no
 * hide clause; in remove mode a span is also hidden when its parent is. The spans must be in
 * pre-order, which transform-trace-data.ts guarantees, so that a parent is decided before its
 * children. The page and the timeline both evaluate the same spans and filter, so the last result
 * is memoized and the text clauses run once per change.
 */
export const evaluateSpanFilter: (
  spans: ReadonlyArray<IOtelSpan> | TNil,
  filter: ISpanFilter
) => ISpanFilterResult = memoizeOne(evaluate);

/**
 * Removes the hidden spans from a set of span IDs, so that the search match count and the
 * highlighting never refer to a span that is not on screen. A search whose matches are all hidden
 * yields an empty set, not null, because the timeline recomputes its focus for an active search
 * and skips that for no search.
 */
export function withoutHiddenSpans(
  spanIDs: ReadonlySet<string> | TNil,
  hiddenIDs: ReadonlySet<string>
): Set<string> | TNil {
  if (!spanIDs || hiddenIDs.size === 0) return spanIDs as Set<string> | TNil;
  const visible = new Set<string>();
  for (const id of spanIDs) {
    if (!hiddenIDs.has(id)) visible.add(id);
  }
  return visible;
}

type ServiceHideClause = IClause & { criterion: Extract<Criterion, { shape: 'set' }> };

/** The hide clause on service is the clause that svcFilter encodes. */
export function isServiceHideClause(clause: IClause): clause is ServiceHideClause {
  return (
    clause.verb === 'hide' && clause.criterion.shape === 'set' && clause.criterion.property === 'service'
  );
}

/** The services the filter hides through its hide clause on service, which is what svcFilter encodes. */
export function hiddenServices(filter: ISpanFilter): Set<string> {
  const clause = filter.clauses.find(isServiceHideClause);
  return clause ? new Set(clause.criterion.values) : new Set();
}

/** Replaces the filter's hide clause on service with one for the given services, or removes it when empty. */
export function withHiddenServices(filter: ISpanFilter, services: ReadonlySet<string>): ISpanFilter {
  // An existing clause keeps its place, so that a chip does not move when its values change; a new
  // one goes last, where the URL reader puts the clause that svcFilter carries.
  const at = filter.clauses.findIndex(isServiceHideClause);
  const clauses = filter.clauses.filter(c => !isServiceHideClause(c));
  if (services.size > 0) {
    clauses.splice(at >= 0 ? at : clauses.length, 0, {
      verb: 'hide',
      criterion: { shape: 'set', property: 'service', values: [...services].sort() },
    });
  }
  return { ...filter, clauses };
}

export function spanFiltersEqual(a: ISpanFilter, b: ISpanFilter): boolean {
  if (a.treeMode !== b.treeMode || a.clauses.length !== b.clauses.length) return false;
  return a.clauses.every((c, i) => encodeClause(c) === encodeClause(b.clauses[i]));
}

// ---- URL codec: each clause is one `f=<verb>:<property>:<value>` parameter ----

const VERB_CODES: Record<Verb, string> = { keep: 'k', hide: 'h' };
const CODE_VERBS: Record<string, Verb> = Object.fromEntries(
  Object.entries(VERB_CODES).map(([verb, code]) => [code, verb as Verb])
);
const SET_PROPERTIES: ReadonlySet<string> = new Set<SetProperty>(['service', 'status', 'kind', 'spanType']);
const RANGE_PROPERTIES: ReadonlySet<string> = new Set<RangeProperty>(['duration', 'tokens']);

const MICROS_PER_MILLI = 1e3;
const MICROS_PER_SECOND = 1e6;

// A duration is written with the largest unit that keeps it an integer, so that a URL reads as
// "120ms-2300ms" rather than as microseconds and the value survives the round trip exactly. An
// open upper bound is written as nothing, so "longer than 2 s" is "2s-".
function encodeRangeBound(property: RangeProperty, v: number): string {
  if (v === Infinity) return '';
  const n = Math.round(v);
  if (property === 'tokens') return String(n);
  if (n % MICROS_PER_SECOND === 0) return `${n / MICROS_PER_SECOND}s`;
  if (n % MICROS_PER_MILLI === 0) return `${n / MICROS_PER_MILLI}ms`;
  return `${n}us`;
}

// A bound beyond the safe integer range would be written back in exponent form, which this decoder
// rejects, so such a bound is rejected on the way in.
function decodeRangeBound(property: RangeProperty, s: string, open: number): number | null {
  if (s === '') return open;
  let value: number;
  if (property === 'tokens') {
    if (!/^\d+$/.test(s)) return null;
    value = Number(s);
  } else {
    const m = /^(\d+(?:\.\d+)?)(us|ms|s)$/.exec(s);
    if (!m) return null;
    let microsPerUnit = 1;
    if (m[2] === 's') microsPerUnit = MICROS_PER_SECOND;
    else if (m[2] === 'ms') microsPerUnit = MICROS_PER_MILLI;
    value = Math.round(Number(m[1]) * microsPerUnit);
  }
  return Number.isSafeInteger(value) ? value : null;
}

// A set value is separated from the next by a comma, so a comma inside a value is escaped, and
// with it the percent sign that the escape uses. The query string layer escapes everything else.
const encodeSetValue = (v: string) => v.replace(/%/g, '%25').replace(/,/g, '%2C');
const decodeSetValue = (v: string) => v.replace(/%2C/gi, ',').replace(/%25/g, '%');

export function encodeClause(clause: IClause): string {
  const verb = VERB_CODES[clause.verb];
  const c = clause.criterion;
  switch (c.shape) {
    case 'text':
      return `${verb}:text:${c.text.trim()}`;
    case 'attr':
      return `${verb}:attr:${c.text.trim()}`;
    case 'set':
      return `${verb}:${c.property}:${[...c.values].sort().map(encodeSetValue).join(',')}`;
    case 'range':
      return `${verb}:${c.property}:${encodeRangeBound(c.property, c.min)}-${encodeRangeBound(c.property, c.max)}`;
  }
}

/** Decodes one `f=` value; returns null for anything malformed, which the caller drops. */
export function decodeClause(encoded: string): IClause | null {
  const m = /^([kh]):([A-Za-z]+):([\s\S]*)$/.exec(encoded);
  if (!m) return null;
  const verb = CODE_VERBS[m[1]];
  const property = m[2];
  const value = m[3];
  if (property === 'text' || property === 'attr') {
    const text = value.trim();
    return text ? { verb, criterion: { shape: property, text } } : null;
  }
  if (SET_PROPERTIES.has(property)) {
    const values = value
      .split(',')
      .map(v => decodeSetValue(v).trim())
      .filter(Boolean);
    return values.length
      ? { verb, criterion: { shape: 'set', property: property as SetProperty, values } }
      : null;
  }
  if (RANGE_PROPERTIES.has(property)) {
    const bounds = value.split('-');
    if (bounds.length !== 2) return null;
    const rangeProperty = property as RangeProperty;
    const min = decodeRangeBound(rangeProperty, bounds[0], 0);
    const max = decodeRangeBound(rangeProperty, bounds[1], Infinity);
    if (min === null || max === null || min > max) return null;
    return { verb, criterion: { shape: 'range', property: rangeProperty, min, max } };
  }
  return null;
}
