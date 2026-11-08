// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This module is the prototype's implementation of the RFC 0009 vocabulary: the criterion
// shapes, the clauses, their evaluation over a trace, the row generation for both tree modes,
// and the URL codec. It knows nothing about React.

export type SpanType = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'Non-GenAI';

export interface ISpan {
  id: string;
  parentId: string | null;
  service: string;
  name: string;
  kind: string;
  status: 'error' | 'ok';
  spanType: SpanType;
  start: number;
  duration: number;
  tokens: number;
  attrs: Array<[string, string]>;
  children: ISpan[];
  depth: number;
}

export interface ITrace {
  spans: ISpan[]; // pre-order
  roots: ISpan[];
  start: number;
  duration: number;
  services: string[];
}

const GENAI_TYPES: Record<string, SpanType> = {
  chat: 'LLM_CALL',
  text_completion: 'LLM_CALL',
  generate_content: 'LLM_CALL',
  embeddings: 'LLM_CALL',
  execute_tool: 'TOOL_CALL',
  invoke_agent: 'AGENT',
  create_agent: 'AGENT',
  invoke_workflow: 'AGENT',
  retrieval: 'RETRIEVAL',
};

// Converts the Jaeger JSON fixture into the flat model above.
export function loadTrace(json: any): ITrace {
  const byId = new Map<string, ISpan>();
  const spans: ISpan[] = json.spans.map((s: any) => {
    const attrs: Array<[string, string]> = s.tags.map((t: any) => [t.key, String(t.value)]);
    const get = (k: string) => attrs.find(a => a[0] === k)?.[1];
    const op = get('gen_ai.operation.name');
    const isError = get('error') === 'true' || get('otel.status_code') === 'ERROR';
    const tokens = attrs
      .filter(a => a[0].startsWith('gen_ai.usage'))
      .reduce((sum, a) => sum + (Number(a[1]) || 0), 0);
    const span: ISpan = {
      id: s.spanID,
      parentId: s.references?.[0]?.spanID ?? null,
      service: json.processes[s.processID].serviceName,
      name: s.operationName,
      kind: get('span.kind') ?? 'internal',
      status: isError ? 'error' : 'ok',
      spanType: op ? (GENAI_TYPES[op] ?? 'Non-GenAI') : 'Non-GenAI',
      start: s.startTime,
      duration: s.duration,
      tokens,
      attrs,
      children: [],
      depth: 0,
    };
    byId.set(span.id, span);
    return span;
  });
  const roots: ISpan[] = [];
  for (const s of spans) {
    const parent = s.parentId ? byId.get(s.parentId) : undefined;
    if (parent) parent.children.push(s);
    else roots.push(s);
  }
  for (const s of spans) s.children.sort((a, b) => a.start - b.start);
  roots.sort((a, b) => a.start - b.start);
  const ordered: ISpan[] = [];
  const walk = (s: ISpan, depth: number) => {
    s.depth = depth;
    ordered.push(s);
    s.children.forEach(c => walk(c, depth + 1));
  };
  roots.forEach(r => walk(r, 0));
  const start = Math.min(...ordered.map(s => s.start));
  const end = Math.max(...ordered.map(s => s.start + s.duration));
  return {
    spans: ordered,
    roots,
    start,
    duration: end - start,
    services: [...new Set(ordered.map(s => s.service))],
  };
}

// ---- Criteria and clauses ----

export type SetProperty = 'status' | 'service' | 'spanType' | 'kind';
export type RangeProperty = 'duration' | 'tokens';

export type Criterion =
  | { shape: 'text'; text: string }
  | { shape: 'set'; property: SetProperty; values: string[] }
  | { shape: 'range'; property: RangeProperty; min: number; max: number }
  | { shape: 'attr'; text: string };

export type Verb = 'find' | 'keep' | 'hide';

export interface IClause {
  id: string;
  verb: Verb;
  criterion: Criterion;
}

export type TreeMode = 'remove' | 'lift';

let nextId = 1;
export const newClause = (verb: Verb, criterion: Criterion): IClause => ({
  id: String(nextId++),
  verb,
  criterion,
});

export const propertyValue = (span: ISpan, property: SetProperty): string => span[property];

// The text criterion is filterSpans from src/utils/filter-spans.ts: whitespace-split terms,
// quoted phrases kept together, -key excludes attribute keys, span ID matches exactly.
function parseTerms(text: string): string[] {
  const terms: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) terms.push((m[1] ?? m[2]).toLowerCase());
  return terms;
}

function matchesText(span: ISpan, text: string): boolean {
  const terms = parseTerms(text.trim());
  if (!terms.length) return false;
  const excludedKeys = terms.filter(t => t.startsWith('-') && t.length > 1).map(t => t.slice(1));
  const positive = terms.filter(t => !t.startsWith('-'));
  if (!positive.length) return false;
  const fields = [span.name.toLowerCase(), span.service.toLowerCase()];
  for (const [k, v] of span.attrs) {
    const key = k.toLowerCase();
    if (excludedKeys.some(x => key.includes(x))) continue;
    fields.push(key, v.toLowerCase(), `${key}=${v.toLowerCase()}`);
  }
  return positive.some(t => t === span.id || fields.some(f => f.includes(t)));
}

export function matches(criterion: Criterion, span: ISpan): boolean {
  switch (criterion.shape) {
    case 'text':
      return matchesText(span, criterion.text);
    case 'set':
      return criterion.values.includes(propertyValue(span, criterion.property));
    case 'range': {
      const v = span[criterion.property];
      return v >= criterion.min && v <= criterion.max;
    }
    case 'attr': {
      const needle = criterion.text.toLowerCase();
      if (!needle) return false;
      return span.attrs.some(([k, v]) => `${k}:${v}`.toLowerCase().includes(needle));
    }
  }
}

export interface IEvaluation {
  hiddenIDs: Set<string>;
  highlightIDs: Set<string>;
  visibleCount: number;
}

// A span is visible when it matches every keep clause and no hide clause; in remove mode every
// descendant of a hidden span is hidden too. The highlight set is the union of the find clauses'
// matches, restricted to visible spans.
export function evaluate(trace: ITrace, clauses: IClause[], uiFind: string, mode: TreeMode): IEvaluation {
  const keeps = clauses.filter(c => c.verb === 'keep');
  const hides = clauses.filter(c => c.verb === 'hide');
  const finds: Criterion[] = clauses.filter(c => c.verb === 'find').map(c => c.criterion);
  if (uiFind.trim()) finds.push({ shape: 'text', text: uiFind });
  const hiddenIDs = new Set<string>();
  const highlightIDs = new Set<string>();
  for (const span of trace.spans) {
    const removedWithParent = mode === 'remove' && span.parentId !== null && hiddenIDs.has(span.parentId);
    const visible =
      !removedWithParent &&
      keeps.every(c => matches(c.criterion, span)) &&
      !hides.some(c => matches(c.criterion, span));
    if (!visible) hiddenIDs.add(span.id);
    else if (finds.some(c => matches(c, span))) highlightIDs.add(span.id);
  }
  return { hiddenIDs, highlightIDs, visibleCount: trace.spans.length - hiddenIDs.size };
}

// ---- Row generation ----

export type Row =
  | {
      kind: 'span';
      span: ISpan;
      visibleDepth: number;
      // The hidden spans between this row and its visible parent, nearest the parent first; empty
      // unless the row was lifted.
      via: ISpan[];
      hasChildren: boolean;
      // In lift mode, the hidden error spans credited to this row because it is their nearest
      // visible ancestor. Remove mode reports them on the placeholder row instead.
      hiddenErrors: ISpan[];
    }
  | { kind: 'pruned'; parent: ISpan; visibleDepth: number; count: number; errors: number };

function subtreeStats(span: ISpan): { count: number; errors: number } {
  let count = 0;
  let errors = 0;
  const walk = (s: ISpan) => {
    count += 1;
    if (s.status === 'error') errors += 1;
    s.children.forEach(walk);
  };
  walk(span);
  return { count, errors };
}

// Produces the rows for one render. In remove mode a hidden span takes its subtree with it and
// is credited to the nearest visible ancestor as a placeholder row; in lift mode its visible
// children take its place one indent level shallower, and its error, if any, is credited to the
// nearest visible ancestor's row.
export function buildRows(
  trace: ITrace,
  hiddenIDs: Set<string>,
  mode: TreeMode,
  collapsed: Set<string>
): Row[] {
  const rows: Row[] = [];

  // Returns whether anything visible is under the span, for the chevron of a collapsed row.
  const hasVisibleDescendant = (span: ISpan): boolean =>
    span.children.some(c => {
      if (!hiddenIDs.has(c.id)) return true;
      return mode === 'lift' && hasVisibleDescendant(c);
    });

  interface ICredit {
    count: number;
    errors: number;
    row: Extract<Row, { kind: 'span' }> | null;
  }

  const visit = (span: ISpan, visibleDepth: number, via: ISpan[], credit: ICredit | null) => {
    if (hiddenIDs.has(span.id)) {
      if (mode === 'remove') {
        const stats = subtreeStats(span);
        if (credit) {
          credit.count += stats.count;
          credit.errors += stats.errors;
        }
        return;
      }
      if (span.status === 'error' && credit?.row) credit.row.hiddenErrors.push(span);
      span.children.forEach(c => visit(c, visibleDepth, [...via, span], credit));
      return;
    }
    const hasChildren = hasVisibleDescendant(span) || (mode === 'remove' && span.children.some(c => hiddenIDs.has(c.id)));
    const row: Extract<Row, { kind: 'span' }> = { kind: 'span', span, visibleDepth, via, hasChildren, hiddenErrors: [] };
    rows.push(row);
    if (collapsed.has(span.id)) return;
    const own: ICredit = { count: 0, errors: 0, row };
    span.children.forEach(c => visit(c, visibleDepth + 1, [], own));
    if (own.count > 0) rows.push({ kind: 'pruned', parent: span, visibleDepth: visibleDepth + 1, count: own.count, errors: own.errors });
  };

  trace.roots.forEach(r => visit(r, 0, [], null));
  return rows;
}

// Ancestors of a span, nearest first.
export function ancestors(trace: ITrace, span: ISpan): ISpan[] {
  const byId = new Map(trace.spans.map(s => [s.id, s]));
  const out: ISpan[] = [];
  let cur = span.parentId ? byId.get(span.parentId) : undefined;
  while (cur) {
    out.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return out;
}

// ---- Formatting ----

export function fmtDuration(us: number): string {
  if (us >= 1e6) return `${trim(us / 1e6)} s`;
  if (us >= 1e3) return `${trim(us / 1e3)} ms`;
  return `${Math.round(us)} µs`;
}

export function fmtTokens(n: number): string {
  return n >= 1000 ? `${trim(n / 1000)}k` : String(Math.round(n));
}

const trim = (n: number) => Number(n.toPrecision(3)).toString();

export const SPAN_TYPE_LABEL: Record<SpanType, string> = {
  LLM_CALL: 'LLM call',
  TOOL_CALL: 'Tool call',
  AGENT: 'Agent',
  RETRIEVAL: 'Retrieval',
  'Non-GenAI': 'Non-GenAI',
};

const PROPERTY_LABEL: Record<SetProperty | RangeProperty, string> = {
  status: 'status',
  service: 'service',
  spanType: 'span type',
  kind: 'kind',
  duration: 'duration',
  tokens: 'tokens',
};

export function describe(c: Criterion): string {
  switch (c.shape) {
    case 'text':
      return `text: ${c.text}`;
    case 'attr':
      return `attribute: ${c.text}`;
    case 'set': {
      const vals = c.property === 'spanType' ? c.values.map(v => SPAN_TYPE_LABEL[v as SpanType] ?? v) : c.values;
      return `${PROPERTY_LABEL[c.property]}: ${vals.join(', ')}`;
    }
    case 'range': {
      const f = c.property === 'duration' ? fmtDuration : fmtTokens;
      return `${PROPERTY_LABEL[c.property]}: ${f(c.min)} – ${f(c.max)}`;
    }
  }
}

// ---- URL codec: f=<k|h|f>:<property>:<value>, repeated; tree=lift ----

const VERB_CODE: Record<Verb, string> = { find: 'f', keep: 'k', hide: 'h' };
const CODE_VERB: Record<string, Verb> = { f: 'find', k: 'keep', h: 'hide' };
const SPAN_TYPE_CODE: Record<string, string> = { 'Non-GenAI': 'none' };
const CODE_SPAN_TYPE: Record<string, string> = { none: 'Non-GenAI' };

function encodeRangeValue(property: RangeProperty, v: number): string {
  if (property === 'tokens') return String(Math.round(v));
  if (v >= 1e6) return `${trim(v / 1e6)}s`;
  if (v >= 1e3) return `${trim(v / 1e3)}ms`;
  return `${Math.round(v)}us`;
}

function decodeRangeValue(property: RangeProperty, s: string): number {
  if (property === 'tokens') return Number(s);
  const m = /^([\d.]+)(us|ms|s)$/.exec(s);
  if (!m) return Number(s);
  const n = Number(m[1]);
  return m[2] === 's' ? n * 1e6 : m[2] === 'ms' ? n * 1e3 : n;
}

export function encodeClause(c: IClause): string {
  const v = VERB_CODE[c.verb];
  const cr = c.criterion;
  switch (cr.shape) {
    case 'text':
      return `${v}:text:${cr.text}`;
    case 'attr':
      return `${v}:attr:${cr.text}`;
    case 'set':
      return `${v}:${cr.property}:${cr.values.map(x => SPAN_TYPE_CODE[x] ?? x).join(',')}`;
    case 'range':
      return `${v}:${cr.property}:${encodeRangeValue(cr.property, cr.min)}-${encodeRangeValue(cr.property, cr.max)}`;
  }
}

export function decodeClause(s: string): IClause | null {
  const m = /^([fkh]):([a-zA-Z]+):(.*)$/.exec(s);
  if (!m) return null;
  const verb = CODE_VERB[m[1]];
  const property = m[2];
  const value = m[3];
  if (property === 'text') return newClause(verb, { shape: 'text', text: value });
  if (property === 'attr') return newClause(verb, { shape: 'attr', text: value });
  if (property === 'duration' || property === 'tokens') {
    const parts = value.split('-');
    if (parts.length !== 2) return null;
    return newClause(verb, {
      shape: 'range',
      property,
      min: decodeRangeValue(property, parts[0]),
      max: decodeRangeValue(property, parts[1]),
    });
  }
  if (property === 'status' || property === 'service' || property === 'spanType' || property === 'kind') {
    return newClause(verb, {
      shape: 'set',
      property,
      values: value.split(',').map(x => CODE_SPAN_TYPE[x] ?? x),
    });
  }
  return null;
}

export interface IUrlState {
  uiFind: string;
  clauses: IClause[] | null; // null means the URL is silent about filters
  treeMode: TreeMode | null;
}

export function readUrl(search: string): IUrlState {
  const params = new URLSearchParams(search);
  const fs = params.getAll('f');
  return {
    uiFind: params.get('uiFind') ?? '',
    clauses: params.has('f') ? fs.filter(Boolean).map(decodeClause).filter((c): c is IClause => !!c) : null,
    treeMode: params.get('tree') === 'lift' ? 'lift' : params.has('tree') ? 'remove' : null,
  };
}

export function writeUrl(uiFind: string, clauses: IClause[] | null, treeMode: TreeMode | null): string {
  const params = new URLSearchParams();
  if (uiFind) params.set('uiFind', uiFind);
  if (clauses !== null) {
    if (clauses.length === 0) params.append('f', '');
    for (const c of clauses) params.append('f', encodeClause(c));
  }
  if (treeMode === 'lift') params.set('tree', 'lift');
  const s = params.toString();
  return s ? `?${s}` : '';
}
