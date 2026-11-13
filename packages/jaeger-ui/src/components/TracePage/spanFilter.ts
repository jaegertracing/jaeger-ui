// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This module is the criterion vocabulary of RFC 0009. A criterion is a predicate over one span,
// a clause applies a verb (keep, hide) to a criterion, and a span filter is the clause
// list plus the tree mode that decides what happens to the children of a hidden span. The
// timeline consumes the evaluation result as sets of span IDs, so that the row generation, the
// critical path and the search match count do not need to know which clause hid or found a span.
// The result is derived from the trace at hand rather than stored, so a caller that holds a
// different or newer trace than the timeline never sees a stale set. The module also holds the
// `f=` URL codec; the codec of the legacy `svcFilter` parameter stays in url/svcFilter.ts.

import { TNil } from '../../types';
import { GenAISpanKind, IAttribute, IOtelSpan } from '../../types/otel';
import { Microseconds } from '../../types/units';
import memoizeOne from 'memoize-one';
import { formatDuration } from '../../utils/date';
import filterSpans, { stringifyAttributeValue } from '../../utils/filter-spans';
import { getGenAiTokenUsage } from './TraceTimelineViewer/SpanDetail/GenAITab/genAiData';
import { GEN_AI_KIND_META } from './TraceTimelineViewer/spanDecorations';
import { isErrorSpan } from './TraceTimelineViewer/utils';

export type SetProperty = 'service' | 'status' | 'kind' | 'spanType';
export type RangeProperty = 'duration' | 'tokens';

export type Criterion =
  | { shape: 'text'; text: string }
  | { shape: 'set'; property: SetProperty; values: ReadonlyArray<string> }
  | { shape: 'range'; property: RangeProperty; min: number; max: number }
  | { shape: 'attr'; text: string };

export type Verb = 'keep' | 'hide';

export interface IClause {
  verb: Verb;
  criterion: Criterion;
}

export type TreeMode = 'remove' | 'lift';

export interface ISpanFilter {
  clauses: ReadonlyArray<IClause>;
  treeMode: TreeMode;
}

export const EMPTY_SPAN_FILTER: ISpanFilter = { clauses: [], treeMode: 'lift' };

/** The tooltip of every control that would create a keep clause while the tree mode is remove. */
export const KEEP_NEEDS_LIFT = 'Keep filters need "Lift to its parent" as the tree mode';
/** The tooltip of a search-input menu entry whose conversion would leave no span shown. */
export const LEAVES_NO_SPAN = 'This filter would leave no span shown';
/** The tooltip of the attribute input's eyes while the typed text matches no span of the trace. */
export const NO_SPAN_MATCHES = 'No span has this attribute';

/** The span type value of a span that carries no gen_ai attributes. */
const NON_GENAI_SPAN_TYPE = 'none';

const STATUS_ERROR = 'error';
const STATUS_OK = 'ok';

// The value of a span for a set property, in the form the set criterion and the facet lists use.
function spanSetValue(span: IOtelSpan, property: SetProperty): string {
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
// modality breakdowns of those totals are not counted twice. A span without token usage has no
// token value, so a token range never matches it and the token histogram does not count it.
// The total is rounded to a count, because the URL carries token bounds as integers, and a
// total that is not a safe non-negative integer is no usage.
function spanTokens(span: IOtelSpan): number | null {
  const usage = getGenAiTokenUsage(span.attributes);
  if (!usage || (usage.inputTokens == null && usage.outputTokens == null)) return null;
  const sum = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  if (!Number.isFinite(sum)) return null;
  const total = Math.round(sum) || 0;
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}

function spanRangeValue(span: IOtelSpan, property: RangeProperty): number | null {
  return property === 'duration' ? span.duration : spanTokens(span);
}

/**
 * The per-value span counts and the sorted range values of a whole trace, which the popover draws
 * as bars and histograms. They are computed over every span rather than the visible ones, so that
 * a count says what acting on it would do, and once per trace, since they depend on nothing else.
 */
export interface ITraceFacets {
  values: Record<SetProperty, ReadonlyMap<string, number>>;
  ranges: Record<RangeProperty, ReadonlyArray<number>>;
}

const SET_PROPERTY_LIST: ReadonlyArray<SetProperty> = ['service', 'status', 'kind', 'spanType'];

function computeTraceFacets(spans: ReadonlyArray<IOtelSpan>): ITraceFacets {
  const values = Object.fromEntries(SET_PROPERTY_LIST.map(p => [p, new Map<string, number>()])) as Record<
    SetProperty,
    Map<string, number>
  >;
  const durations: number[] = [];
  const tokens: number[] = [];
  for (const span of spans) {
    for (const property of SET_PROPERTY_LIST) {
      const counts = values[property];
      const value = spanSetValue(span, property);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    durations.push(span.duration);
    const t = spanTokens(span);
    if (t != null) tokens.push(t);
  }
  const ascending = (a: number, b: number) => a - b;
  return { values, ranges: { duration: durations.sort(ascending), tokens: tokens.sort(ascending) } };
}

export const traceFacets: (spans: ReadonlyArray<IOtelSpan>) => ITraceFacets = memoizeOne(computeTraceFacets);

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

/** The IDs of the spans that an attribute criterion with this text matches. */
export function attributeMatchIDs(spans: ReadonlyArray<IOtelSpan>, text: string): ReadonlySet<string> {
  const needle = text.toLowerCase();
  const ids = new Set<string>();
  for (const span of spans) {
    if (matchesAttribute(span, needle)) ids.add(span.spanID);
  }
  return ids;
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
      return span => values.has(spanSetValue(span, criterion.property));
    }
    case 'range':
      return span => {
        const v = spanRangeValue(span, criterion.property);
        return v != null && v >= criterion.min && v <= criterion.max;
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
 * Whether the filter hides every one of the spans. The popover asks this of the trace for each edit
 * it is about to apply, through the same memoized evaluation as the page, so the committed filter
 * costs nothing to ask about.
 */
export function hidesEverySpan(spans: ReadonlyArray<IOtelSpan>, filter: ISpanFilter): boolean {
  return spans.length > 0 && evaluateSpanFilter(spans, filter).hiddenIDs.size === spans.length;
}

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

type SetClause = IClause & { criterion: Extract<Criterion, { shape: 'set' }> };
type RangeClause = IClause & { criterion: Extract<Criterion, { shape: 'range' }> };

function isSetClause(clause: IClause, verb: Verb, property: SetProperty): clause is SetClause {
  return clause.verb === verb && clause.criterion.shape === 'set' && clause.criterion.property === property;
}

/** The services the filter hides through its hide clause on service. */
export function hiddenServices(filter: ISpanFilter): Set<string> {
  return setClauseValues(filter, 'hide', 'service');
}

/** Replaces the filter's hide clause on service with one for the given services, or removes it when empty. */
export function withHiddenServices(filter: ISpanFilter, services: ReadonlySet<string>): ISpanFilter {
  return withSetClause(filter, 'hide', 'service', services);
}

/**
 * The values of the filter's clauses with the verb on the set property, or an empty set. A URL may
 * repeat a clause, and evaluation applies them all, so the union is what the controls show.
 */
export function setClauseValues(filter: ISpanFilter, verb: Verb, property: SetProperty): Set<string> {
  const values = new Set<string>();
  for (const clause of filter.clauses) {
    if (isSetClause(clause, verb, property)) clause.criterion.values.forEach(v => values.add(v));
  }
  return values;
}

/**
 * Replaces the clauses that match by the one clause, in the place of the first match so that the
 * chips keep their order, or adds the clause when nothing matches; a null clause removes the
 * matches.
 */
function replaceClauses(
  filter: ISpanFilter,
  matches: (clause: IClause) => boolean,
  clause: IClause | null
): ISpanFilter {
  const at = filter.clauses.findIndex(matches);
  const rest = filter.clauses.filter(c => !matches(c));
  if (!clause) return { ...filter, clauses: rest };
  if (at === -1) return { ...filter, clauses: [...rest, clause] };
  return { ...filter, clauses: [...rest.slice(0, at), clause, ...rest.slice(at)] };
}

/**
 * Replaces the filter's clauses with the verb on the set property by one clause with the values,
 * or removes them when the values are empty.
 */
export function withSetClause(
  filter: ISpanFilter,
  verb: Verb,
  property: SetProperty,
  values: ReadonlySet<string>
): ISpanFilter {
  const clause: IClause | null =
    values.size > 0 ? { verb, criterion: { shape: 'set', property, values: [...values].sort() } } : null;
  return replaceClauses(filter, c => isSetClause(c, verb, property), clause);
}

/**
 * Replaces the filter's keep and hide clauses on the set property by clauses for the given values,
 * which is what the controls that choose values for a property do.
 */
export function withKeptAndHidden(
  filter: ISpanFilter,
  property: SetProperty,
  kept: ReadonlySet<string>,
  hidden: ReadonlySet<string>
): ISpanFilter {
  return withSetClause(withSetClause(filter, 'keep', property, kept), 'hide', property, hidden);
}

function isKeepRange(clause: IClause, property: RangeProperty): clause is RangeClause {
  return (
    clause.verb === 'keep' && clause.criterion.shape === 'range' && clause.criterion.property === property
  );
}

/**
 * The range that the filter's keep clauses on the range property keep together, which is their
 * intersection, or null without such a clause. Clauses that keep nothing together read as the
 * single value at their lower bound, so that the slider has a range to draw.
 */
export function keepRange(filter: ISpanFilter, property: RangeProperty): { min: number; max: number } | null {
  let hasKeepRange = false;
  let min = 0;
  let max = Infinity;
  for (const clause of filter.clauses) {
    if (isKeepRange(clause, property)) {
      hasKeepRange = true;
      min = Math.max(min, clause.criterion.min);
      max = Math.min(max, clause.criterion.max);
    }
  }
  return hasKeepRange ? { min, max: Math.max(min, max) } : null;
}

/** Replaces the filter's keep clauses on the range property by one for the range, or removes them when null. */
export function withKeepRange(
  filter: ISpanFilter,
  property: RangeProperty,
  range: { min: number; max: number } | null
): ISpanFilter {
  const clause: IClause | null = range
    ? { verb: 'keep', criterion: { shape: 'range', property, ...range } }
    : null;
  return replaceClauses(filter, c => isKeepRange(c, property), clause);
}

const PROPERTY_LABEL: Record<SetProperty | RangeProperty, string> = {
  service: 'service',
  status: 'status',
  kind: 'kind',
  spanType: 'span type',
  duration: 'duration',
  tokens: 'tokens',
};

/** The label of a set value as the chips and the value lists show it, such as "Non-GenAI" for the span type `none`. */
export function setValueLabel(property: SetProperty, value: string): string {
  switch (property) {
    case 'spanType':
      if (value === NON_GENAI_SPAN_TYPE) return 'Non-GenAI';
      return GEN_AI_KIND_META[value.toUpperCase() as GenAISpanKind]?.label ?? value;
    case 'kind':
      return value.charAt(0).toUpperCase() + value.slice(1);
    case 'status':
      if (value === STATUS_ERROR) return 'Error';
      if (value === STATUS_OK) return 'No error';
      return value;
    default:
      return value;
  }
}

/** The short form of a criterion that a chip shows, such as "status: Error" or "text: tools/call". */
export function describeCriterion(criterion: Criterion): string {
  switch (criterion.shape) {
    case 'text':
      return `text: ${criterion.text}`;
    case 'attr':
      return `attribute: ${criterion.text}`;
    case 'set':
      return `${PROPERTY_LABEL[criterion.property]}: ${criterion.values.map(v => setValueLabel(criterion.property, v)).join(', ')}`;
    case 'range': {
      const format = (v: number) => {
        if (v === Infinity) return '∞';
        return criterion.property === 'duration' ? formatDuration(v as Microseconds) : String(v);
      };
      return `${PROPERTY_LABEL[criterion.property]}: ${format(criterion.min)} – ${format(criterion.max)}`;
    }
  }
}

/** The set values as the facet rows spell them: lower-cased except for service names, deduplicated and sorted. */
function canonicalSetValues(property: SetProperty, values: ReadonlyArray<string>): string[] {
  return [...new Set(property === 'service' ? values : values.map(v => v.toLowerCase()))].sort();
}

const PROPERTY_ORDER: Record<SetProperty | RangeProperty, number> = {
  service: 0,
  status: 1,
  kind: 2,
  spanType: 3,
  duration: 4,
  tokens: 5,
};

function clauseRank(clause: IClause): number {
  switch (clause.criterion.shape) {
    case 'set':
    case 'range':
      return PROPERTY_ORDER[clause.criterion.property];
    case 'attr':
      return 6;
    case 'text':
      return 7;
  }
}

// The order in which the chips are listed: by property in the order of the popover's controls,
// then attribute and text criteria, alphabetical by criterion within that, and keep before hide
// only for one criterion under both verbs. The verb comes last so that a chip keeps its place when
// its verb switches, and the order depends on nothing else, so a chip keeps its place when the
// filter is read again from the URL.
function compareClauses(a: IClause, b: IClause): number {
  const rank = clauseRank(a) - clauseRank(b);
  if (rank !== 0) return rank;
  // Plain code-unit order, because localeCompare treats some distinct strings as equal.
  const ca = encodeClause(a).slice(2);
  const cb = encodeClause(b).slice(2);
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.verb === b.verb ? 0 : a.verb === 'keep' ? -1 : 1;
}

/**
 * The filter with one set clause per verb and property, holding the union of their values in the
 * spelling the facet rows use, without a second copy of any other clause, and with the clauses in
 * the order the chips are listed; the same filter when nothing changes. A set clause matches a span
 * whose value is in the set, so two hide clauses on one property mean the same as their union, and
 * a keep clause on one property is one chip with the values it keeps.
 */
export function normalizeFilter(filter: ISpanFilter): ISpanFilter {
  const seen = new Set<string>();
  const sets = new Map<string, IClause>();
  const clauses: IClause[] = [];
  let changed = false;
  for (const original of filter.clauses) {
    let clause = original;
    if (clause.criterion.shape === 'set') {
      const { property } = clause.criterion;
      const key = `${clause.verb}:${property}`;
      const first = sets.get(key);
      if (first && first.criterion.shape === 'set') {
        const values = canonicalSetValues(property, [...first.criterion.values, ...clause.criterion.values]);
        const merged: IClause = { ...first, criterion: { ...first.criterion, values } };
        sets.set(key, merged);
        clauses[clauses.indexOf(first)] = merged;
        changed = true;
        continue;
      }
      const original = clause.criterion.values;
      const values = canonicalSetValues(property, original);
      const same = values.length === original.length && values.every((v, i) => v === original[i]);
      if (!same) {
        clause = { ...clause, criterion: { ...clause.criterion, values } };
        changed = true;
      }
      sets.set(key, clause);
    }
    const encoded = encodeClause(clause);
    if (seen.has(encoded)) {
      changed = true;
      continue;
    }
    seen.add(encoded);
    clauses.push(clause);
  }
  clauses.sort(compareClauses);
  if (!changed) changed = clauses.some((c, i) => c !== filter.clauses[i]);
  return changed ? { ...filter, clauses } : filter;
}

/** Two filters are equal when they mean the same: the order of the clauses does not matter. */
export function spanFiltersEqual(a: ISpanFilter, b: ISpanFilter): boolean {
  if (a.treeMode !== b.treeMode || a.clauses.length !== b.clauses.length) return false;
  const encoded = (f: ISpanFilter) => f.clauses.map(encodeClause).sort();
  const [ea, eb] = [encoded(a), encoded(b)];
  return ea.every((c, i) => c === eb[i]);
}

// ---- URL codec: each clause is one `f=<verb>:<property>:<value>` parameter ----

const VERB_CODES: Record<Verb, string> = { keep: 'k', hide: 'h' };
const CODE_VERBS: Record<string, Verb> = Object.fromEntries(
  Object.entries(VERB_CODES).map(([verb, code]) => [code, verb as Verb])
);
const SET_PROPERTIES: ReadonlySet<string> = new Set<string>(SET_PROPERTY_LIST);
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
    // A service name is kept as written, blanks and the empty name included, because the trace
    // keeps them too and the value has to name the service exactly; the other properties have a
    // fixed vocabulary that a URL may spell loosely.
    const values =
      property === 'service'
        ? value.split(',').map(decodeSetValue)
        : value
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
