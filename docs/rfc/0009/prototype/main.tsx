// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This file is the RFC 0009 prototype UI: the one-line search and filter cluster, the filter
// popover, and a minimal timeline that renders the rows the model produces. It is not part of
// the application and is not linted or tested; run it with ./run.sh.
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge, Button, Dropdown, Input, InputNumber, Popover, Radio, Segmented, Slider, Tooltip } from 'antd';
import { IoChevronDown, IoChevronUp, IoClose, IoEye, IoEyeOff, IoFilter, IoLocate, IoSearch } from 'react-icons/io5';
import fixture from '../../../../packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/genaiTestTrace.json';
import {
  ancestors,
  buildRows,
  describe,
  evaluate,
  fmtDuration,
  fmtTokens,
  IClause,
  ISpan,
  ITrace,
  loadTrace,
  newClause,
  readUrl,
  RangeProperty,
  Row,
  SetProperty,
  SPAN_TYPE_LABEL,
  SpanType,
  TreeMode,
  Verb,
  writeUrl,
} from './model';

const trace: ITrace = loadTrace(fixture);
const PALETTE = ['#4c7bd9', '#e67e22', '#2b8a3e', '#c92a2a', '#8e44ad', '#16a085', '#d35400', '#2c3e50', '#7f8c8d', '#b8860b'];
const totalErrors = trace.spans.filter(s => s.status === 'error').length;
const serviceColor = (svc: string) => PALETTE[trace.services.indexOf(svc) % PALETTE.length];

type View = 'timeline' | 'genai';
const VIEW_DEFAULT: Record<View, { clauses: IClause[]; treeMode: TreeMode }> = {
  timeline: { clauses: [], treeMode: 'remove' },
  genai: { clauses: [newClause('hide', { shape: 'set', property: 'spanType', values: ['Non-GenAI'] })], treeMode: 'lift' },
};

const VerbIcon = ({ verb, size = 14 }: { verb: Verb; size?: number }) =>
  verb === 'keep' ? <IoEye size={size} className="keep" /> : verb === 'hide' ? <IoEyeOff size={size} className="hide" /> : <IoSearch size={size} className="find" />;

const NEXT_VERB: Record<Verb, Verb> = { keep: 'hide', hide: 'find', find: 'keep' };

// A popover section with a heading that folds its body; every section is open by default.
function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <h4>
        <span className="fold" onClick={() => setOpen(o => !o)}>
          {open ? '▾' : '▸'} {title}
        </span>
        {open && actions && <span className="actions">{actions}</span>}
      </h4>
      {open && children}
    </div>
  );
}

const KEEP_NEEDS_LIFT = 'Keep filters need "Lift to its parent": in Remove mode a keep filter hides the root and with it the whole trace.';

// A tooltip lists at most this many spans; a deep chain of hidden plumbing would otherwise fill the screen.
const TOOLTIP_SPAN_LIMIT = 6;
const SpanList = ({ heading, spans }: { heading: string; spans: ISpan[] }) => (
  <>
    {heading}
    <br />
    {spans.slice(0, TOOLTIP_SPAN_LIMIT).map(v => (
      <div key={v.id}>
        {v.service} {v.name}
      </div>
    ))}
    {spans.length > TOOLTIP_SPAN_LIMIT && <div>… and {spans.length - TOOLTIP_SPAN_LIMIT} more</div>}
  </>
);

// ---- Filter state helpers (pure functions over a clause list) ----

const setChip = (clauses: IClause[], property: SetProperty, verb: Verb) =>
  clauses.find(c => c.verb === verb && c.criterion.shape === 'set' && c.criterion.property === property);

function withoutProperty(clauses: IClause[], property: SetProperty | RangeProperty, verbs: Verb[] = ['keep', 'hide']) {
  return clauses.filter(c => !(verbs.includes(c.verb) && (c.criterion.shape === 'set' || c.criterion.shape === 'range') && c.criterion.property === property));
}

// Replaces the property's filter chips with one keep chip, which is the "only this value" gesture.
function keepOnly(clauses: IClause[], property: SetProperty, value: string): IClause[] {
  const existing = setChip(clauses, property, 'keep');
  const rest = withoutProperty(clauses, property);
  if (existing && existing.criterion.shape === 'set' && existing.criterion.values.length === 1 && existing.criterion.values[0] === value) return rest;
  return [...rest, newClause('keep', { shape: 'set', property, values: [value] })];
}

// Adds the value to, or removes it from, the property's hide chip.
function toggleHide(clauses: IClause[], property: SetProperty, value: string): IClause[] {
  const existing = setChip(clauses, property, 'hide');
  const values = existing && existing.criterion.shape === 'set' ? existing.criterion.values : [];
  const next = values.includes(value) ? values.filter(v => v !== value) : [...values, value];
  const rest = clauses.filter(c => c !== existing);
  return next.length ? [...rest, existing ? { ...existing, criterion: { shape: 'set', property, values: next } } : newClause('hide', { shape: 'set', property, values: next })] : rest;
}

function isValueHidden(clauses: IClause[], property: SetProperty, value: string): boolean {
  const hide = setChip(clauses, property, 'hide');
  const keep = setChip(clauses, property, 'keep');
  if (hide && hide.criterion.shape === 'set' && hide.criterion.values.includes(value)) return true;
  if (keep && keep.criterion.shape === 'set' && !keep.criterion.values.includes(value)) return true;
  return false;
}

// ---- Histogram ----

interface IHistogram {
  edges: number[];
  counts: number[];
}

function histogram(values: number[], bins: number, log: boolean): IHistogram {
  const positive = values.filter(v => v > 0);
  const lo = Math.min(...positive);
  const hi = Math.max(...positive);
  const edges: number[] = [];
  for (let i = 0; i <= bins; i++) {
    edges.push(log ? Math.exp(Math.log(lo) + ((Math.log(hi) - Math.log(lo)) * i) / bins) : lo + ((hi - lo) * i) / bins);
  }
  const counts: number[] = Array.from({ length: bins }, () => 0);
  for (const v of positive) {
    let i = edges.findIndex((e, idx) => idx < bins && v >= e && v <= edges[idx + 1]);
    if (i < 0) i = bins - 1;
    counts[i] += 1;
  }
  return { edges, counts };
}

const nearestEdge = (edges: number[], v: number) => edges.reduce((best, e, i) => (Math.abs(e - v) < Math.abs(edges[best] - v) ? i : best), 0);

function RangeControl({
  property,
  values,
  format,
  clauses,
  setClauses,
  keepAllowed,
}: {
  property: RangeProperty;
  values: number[];
  format: (n: number) => string;
  clauses: IClause[];
  setClauses: (c: IClause[]) => void;
  keepAllowed: boolean;
}) {
  const bins = 16;
  const h = useMemo(() => histogram(values, bins, true), [values]);
  const chip = clauses.find(c => c.verb === 'keep' && c.criterion.shape === 'range' && c.criterion.property === property);
  const range: [number, number] = chip && chip.criterion.shape === 'range' ? [nearestEdge(h.edges, chip.criterion.min), nearestEdge(h.edges, chip.criterion.max)] : [0, bins];
  const max = Math.max(...h.counts, 1);
  const onChange = ([lo, hi]: number[]) => {
    const rest = withoutProperty(clauses, property, ['keep']);
    if (lo === 0 && hi === bins) setClauses(rest);
    else setClauses([...rest, newClause('keep', { shape: 'range', property, min: h.edges[lo], max: h.edges[hi] })]);
  };
  return (
    <div>
      <div className="hist">
        {h.counts.map((c, i) => (
          <Tooltip key={i} title={`${format(h.edges[i])} – ${format(h.edges[i + 1])}: ${c} spans`}>
            <div className={i < range[0] || i >= range[1] ? 'out' : ''} style={{ height: `${(c / max) * 100}%` }} />
          </Tooltip>
        ))}
      </div>
      <Tooltip title={keepAllowed ? null : KEEP_NEEDS_LIFT}>
        <div>
          <Slider range disabled={!keepAllowed} min={0} max={bins} step={1} value={range} onChange={onChange} tooltip={{ formatter: v => format(h.edges[v ?? 0]) }} style={{ margin: '4px 6px' }} />
        </div>
      </Tooltip>
      <div className="hist-axis">
        <span>{format(h.edges[0])}</span>
        <span>{format(h.edges[bins])}</span>
      </div>
    </div>
  );
}

// ---- Value lists ----

interface IValueRow {
  value: string;
  label: string;
  count: number;
  color?: string;
  root?: boolean;
}

function ValueList({
  title,
  property,
  rows,
  clauses,
  setClauses,
  keepAllowed,
}: {
  title: string;
  property: SetProperty;
  rows: IValueRow[];
  clauses: IClause[];
  setClauses: (c: IClause[]) => void;
  keepAllowed: boolean;
}) {
  const max = Math.max(...rows.map(r => r.count), 1);
  const keep = setChip(clauses, property, 'keep');
  const hide = setChip(clauses, property, 'hide');
  return (
    <Section
      title={title}
      actions={
        <>
          <a onClick={() => setClauses(withoutProperty(clauses, property))}>Select All</a>
          <a onClick={() => setClauses([...withoutProperty(clauses, property), newClause('hide', { shape: 'set', property, values: rows.map(r => r.value) })])}>Select None</a>
        </>
      }
    >
      <div className="vals">
        {rows.map(r => {
          const hidden = isValueHidden(clauses, property, r.value);
          const onlyThis = !!keep && keep.criterion.shape === 'set' && keep.criterion.values.length === 1 && keep.criterion.values[0] === r.value;
          const inHide = !!hide && hide.criterion.shape === 'set' && hide.criterion.values.includes(r.value);
          return (
            <div key={r.value} className={`val${hidden ? ' dim' : ''}`}>
              {r.color && <span className="dot" style={{ background: r.color }} />}
              <span className="name" title={r.label}>
                {r.label} {r.root && <span className="root-badge">root</span>}
              </span>
              <div className="vbar">
                <div style={{ width: `${(r.count / max) * 100}%`, background: r.color ?? '#4c7bd9' }} />
              </div>
              <span className="n">{r.count}</span>
              <Tooltip title={keepAllowed ? 'Keep only this value' : KEEP_NEEDS_LIFT}>
                <span className={`act keep${onlyThis ? ' on' : ''}${keepAllowed ? '' : ' disabled'}`} onClick={() => keepAllowed && setClauses(keepOnly(clauses, property, r.value))}>
                  <IoEye size={15} />
                </span>
              </Tooltip>
              <Tooltip title={inHide ? 'Stop hiding this value' : 'Hide this value'}>
                <span className={`act hide${inHide ? ' on' : ''}`} onClick={() => setClauses(toggleHide(clauses, property, r.value))}>
                  <IoEyeOff size={15} />
                </span>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ---- Popover ----

function FilterPopover({
  clauses,
  setClauses,
  pendingIds,
  treeMode,
  setTreeMode,
  visibleCount,
  needsApply,
  onApply,
  onSaveDefault,
}: {
  clauses: IClause[];
  setClauses: (c: IClause[]) => void;
  pendingIds: Set<string>;
  treeMode: TreeMode;
  setTreeMode: (m: TreeMode) => void;
  visibleCount: number;
  needsApply: boolean;
  onApply: () => void;
  onSaveDefault: () => void;
}) {
  const [attr, setAttr] = useState('');
  const statusChip = setChip(clauses, 'status', 'keep');
  const statusValue = statusChip && statusChip.criterion.shape === 'set' ? (statusChip.criterion.values[0] === 'error' ? 'Error' : 'No error') : 'Any';
  const count = (property: SetProperty) => {
    const m = new Map<string, number>();
    trace.spans.forEach(s => m.set(s[property], (m.get(s[property]) ?? 0) + 1));
    return m;
  };
  const types = count('spanType');
  const kinds = count('kind');
  const services = count('service');
  const rootServices = new Set(trace.roots.map(r => r.service));
  const tokenValues = trace.spans.map(s => s.tokens).filter(t => t > 0);

  const keepAllowed = treeMode === 'lift';
  return (
    <div className="pop">
      {clauses.length > 0 && (
        <>
          <h4>
            Active filters
            <span className="actions">
              {visibleCount} of {trace.spans.length} spans shown
              <a onClick={() => setClauses([])}>Clear all</a>
            </span>
          </h4>
          <div className="chips">
            {clauses.map(c => {
              const next = NEXT_VERB[c.verb] === 'keep' && !keepAllowed ? 'hide' : NEXT_VERB[c.verb];
              return (
                <span key={c.id} className={`chip${pendingIds.has(c.id) ? ' pending' : ''}`}>
                  <Tooltip title={`Verb: ${c.verb}. Click to switch to ${next}.`}>
                    <span className="verb" onClick={() => setClauses(clauses.map(x => (x.id === c.id ? { ...x, verb: next } : x)))}>
                      <VerbIcon verb={c.verb} />
                    </span>
                  </Tooltip>
                  {describe(c.criterion)}
                  <span className="x" onClick={() => setClauses(clauses.filter(x => x.id !== c.id))}>
                    <IoClose size={12} />
                  </span>
                </span>
              );
            })}
          </div>
        </>
      )}

      <h4>Children of a hidden span</h4>
      <Radio.Group value={treeMode} onChange={e => setTreeMode(e.target.value)}>
        <Radio value="remove">Remove with it</Radio>
        <Radio value="lift">Lift to its parent</Radio>
      </Radio.Group>

      <Section title="Status">
        <Tooltip title={keepAllowed ? null : KEEP_NEEDS_LIFT}>
          <span style={{ display: 'inline-block' }}>
            <Segmented
              size="small"
              disabled={!keepAllowed}
              options={['Any', 'Error', 'No error']}
              value={statusValue}
              onChange={v => {
                const rest = withoutProperty(clauses, 'status');
                if (v === 'Any') setClauses(rest);
                else setClauses([...rest, newClause('keep', { shape: 'set', property: 'status', values: [v === 'Error' ? 'error' : 'ok'] })]);
              }}
            />
          </span>
        </Tooltip>
      </Section>

      <Section title="Span duration">
        <RangeControl property="duration" values={trace.spans.map(s => s.duration)} format={fmtDuration} clauses={clauses} setClauses={setClauses} keepAllowed={keepAllowed} />
      </Section>

      {tokenValues.length > 0 && (
        <Section title="Span tokens">
          <RangeControl property="tokens" values={tokenValues} format={fmtTokens} clauses={clauses} setClauses={setClauses} keepAllowed={keepAllowed} />
        </Section>
      )}

      <Section title="Attribute contains">
        <Tooltip title={keepAllowed ? null : KEEP_NEEDS_LIFT}>
          <Input
            size="small"
            disabled={!keepAllowed}
            placeholder="key:value, a bare key, or a bare value"
            value={attr}
            onChange={e => setAttr(e.target.value)}
            onPressEnter={() => {
              if (!attr.trim()) return;
              setClauses([...clauses, newClause('keep', { shape: 'attr', text: attr.trim() })]);
              setAttr('');
            }}
          />
        </Tooltip>
      </Section>

      <ValueList
        title="Span type"
        property="spanType"
        rows={[...types.entries()].map(([v, n]) => ({ value: v, label: SPAN_TYPE_LABEL[v as SpanType], count: n }))}
        clauses={clauses}
        setClauses={setClauses}
        keepAllowed={keepAllowed}
      />
      <ValueList title="Span kind" property="kind" rows={[...kinds.entries()].map(([v, n]) => ({ value: v, label: v, count: n }))} clauses={clauses} setClauses={setClauses} keepAllowed={keepAllowed} />
      <ValueList
        title="Service"
        property="service"
        rows={trace.services.map(v => ({ value: v, label: v, count: services.get(v) ?? 0, color: serviceColor(v), root: rootServices.has(v) }))}
        clauses={clauses}
        setClauses={setClauses}
        keepAllowed={keepAllowed}
      />

      <div className="footer">
        <Button size="small" onClick={onSaveDefault}>
          Save as Default
        </Button>
        <span className="spacer" />
        {needsApply && (
          <Button size="small" type="primary" onClick={onApply} disabled={pendingIds.size === 0}>
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Timeline ----

function Timeline({
  rows,
  highlightIDs,
  currentId,
  collapsed,
  toggleCollapse,
  onCollapseAll,
  onExpandAll,
  filterButton,
}: {
  rows: Row[];
  filterButton: React.ReactNode;
  highlightIDs: Set<string>;
  currentId: string | null;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) => setOpen(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const pct = (us: number) => `${(us / trace.duration) * 100}%`;
  return (
    <>
      <div className="colhead">
        <div className="left">
          Service &amp; Operation
          <span style={{ marginLeft: 6 }}>{filterButton}</span>
          <span className="collapse">
            <Tooltip title="Expand all"><button onClick={onExpandAll}>⊞</button></Tooltip>
            <Tooltip title="Collapse all"><button onClick={onCollapseAll}>⊟</button></Tooltip>
          </span>
        </div>
        <div className="ticks">
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <span key={f} style={{ left: `${f * 100}%` }}>{fmtDuration(trace.duration * f)}</span>
          ))}
        </div>
      </div>
      <div className="rows">
        {rows.map(row => {
          if (row.kind === 'pruned') {
            return (
              <div key={`pruned-${row.parent.id}`} className="row placeholder">
                <div className="left">
                  {Array.from({ length: row.visibleDepth }).map((_, i) => <span key={i} className="indent" />)}
                  <span className="chev" />
                  <span style={{ paddingLeft: 4 }}>{row.count} spans pruned{row.errors ? `, ${row.errors} errors` : ''}</span>
                </div>
                <div className="right" />
              </div>
            );
          }
          const { span } = row;
          const isMatch = highlightIDs.has(span.id);
          const left = (span.start - trace.start) / trace.duration;
          return (
            <React.Fragment key={span.id}>
              <div id={`row-${span.id}`} className={`row${isMatch ? ' match' : ''}${span.id === currentId ? ' current' : ''}`} onClick={() => toggleOpen(span.id)}>
                <div className="left">
                  {Array.from({ length: row.visibleDepth }).map((_, i) => <span key={i} className={`indent${row.via.length && i === row.visibleDepth - 1 ? ' lifted' : ''}`} />)}
                  <span className="chev" onClick={e => { e.stopPropagation(); if (row.hasChildren) toggleCollapse(span.id); }}>
                    {row.hasChildren ? (collapsed.has(span.id) ? '▶' : '▼') : ''}
                  </span>
                  {row.via.length > 0 && (
                    <Tooltip title={<SpanList heading={`Lifted past ${row.via.length} hidden span${row.via.length > 1 ? 's' : ''}:`} spans={row.via} />}>
                      <span className="lift-glyph">⤷</span>
                    </Tooltip>
                  )}
                  <span className="dot" style={{ background: serviceColor(span.service) }} />
                  <span className="svc">{span.service}</span>
                  <span className="op">{span.name}</span>
                  {span.spanType !== 'Non-GenAI' && <span className="type">{SPAN_TYPE_LABEL[span.spanType]}</span>}
                  {span.status === 'error' && <span className="err">error</span>}
                  {row.hiddenErrors.length > 0 && (
                    <Tooltip title={<SpanList heading={`Hidden error span${row.hiddenErrors.length > 1 ? 's' : ''} under this row:`} spans={row.hiddenErrors} />}>
                      <span className="err hidden-err">{row.hiddenErrors.length} hidden error{row.hiddenErrors.length > 1 ? 's' : ''}</span>
                    </Tooltip>
                  )}
                </div>
                <div className="right">
                  <div className={`bar${span.status === 'error' ? ' error' : ''}`} style={{ left: pct(span.start - trace.start), width: pct(span.duration), background: serviceColor(span.service) }} />
                  <span className="dur" style={left + span.duration / trace.duration > 0.85 ? { right: `${(1 - left) * 100 + 0.5}%` } : { left: `calc(${pct(span.start - trace.start + span.duration)} + 4px)` }}>
                    {fmtDuration(span.duration)}
                  </span>
                </div>
              </div>
              {open.has(span.id) && (
                <div className="detail" style={{ paddingLeft: 16 * row.visibleDepth + 40 }}>
                  <table>
                    <tbody>
                      <tr><td>span ID</td><td>{span.id}</td></tr>
                      <tr><td>kind</td><td>{span.kind}</td></tr>
                      <tr><td>span type</td><td>{SPAN_TYPE_LABEL[span.spanType]}</td></tr>
                      {span.tokens > 0 && <tr><td>tokens</td><td>{span.tokens}</td></tr>}
                      {span.attrs.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
            </React.Fragment>
          );
        })}
        {rows.length === 0 && <div className="row placeholder"><div className="left" style={{ paddingLeft: 12 }}>Every span is hidden.</div></div>}
      </div>
    </>
  );
}

// The funnel button with its badge. It is rendered twice, in the header cluster and in the column
// header, and each instance owns its open state so that only the clicked one opens.
function FilterFunnel({ content, count }: { content: React.ReactNode; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" placement="bottomRight" content={content}>
      <Tooltip title="Filter spans">
        <Badge count={count} size="small" offset={[-2, 2]} color="#4c7bd9">
          <Button size="small" icon={<IoFilter />} type={count ? 'primary' : 'default'} ghost={!!count} />
        </Badge>
      </Tooltip>
    </Popover>
  );
}

// ---- App ----

const savedKey = (view: View) => `rfc0009.default.${view}`;

function App() {
  const initial = useMemo(() => readUrl(window.location.search), []);
  const [view, setView] = useState<View>(() => (new URLSearchParams(window.location.search).get('view') === 'genai' ? 'genai' : 'timeline'));
  const [threshold, setThreshold] = useState(() => Number(new URLSearchParams(window.location.search).get('threshold') ?? 10000));
  const [uiFind, setUiFind] = useState(initial.uiFind);
  // Source of the active filter, following RFC 0007: the URL wins, then a saved default, then the view's own.
  const resolveDefault = (v: View): { clauses: IClause[]; treeMode: TreeMode; source: 'saved' | 'view' } => {
    try {
      const raw = localStorage.getItem(savedKey(v));
      if (raw) {
        const parsed = readUrl(raw);
        return { clauses: parsed.clauses ?? [], treeMode: parsed.treeMode ?? 'remove', source: 'saved' };
      }
    } catch {
      // localStorage may be unavailable; fall through to the view default.
    }
    return { ...VIEW_DEFAULT[v], source: 'view' };
  };
  const [filter, setFilter] = useState<{ clauses: IClause[]; treeMode: TreeMode; source: 'url' | 'saved' | 'view' }>(() => {
    if (initial.clauses !== null || initial.treeMode !== null) {
      return { clauses: initial.clauses ?? [], treeMode: initial.treeMode ?? 'remove', source: 'url' };
    }
    return resolveDefault(view);
  });
  const [draft, setDraft] = useState<IClause[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);

  const { clauses, treeMode } = filter;
  const commit = (next: Partial<{ clauses: IClause[]; treeMode: TreeMode }>) => setFilter(f => ({ ...f, ...next, source: 'url' }));
  const changeView = (v: View) => {
    setView(v);
    setDraft(null);
    if (filter.source !== 'url') setFilter(resolveDefault(v));
  };

  const evaluation = useMemo(() => evaluate(trace, clauses, uiFind, treeMode), [clauses, uiFind, treeMode]);
  const rows = useMemo(() => buildRows(trace, evaluation.hiddenIDs, treeMode, collapsed), [evaluation, treeMode, collapsed]);
  const needsApply = trace.spans.length > threshold;
  const editing = draft ?? clauses;
  const pendingIds = useMemo(() => {
    if (!draft) return new Set<string>();
    const committed = new Set(clauses.map(c => `${c.id}:${c.verb}:${describe(c.criterion)}`));
    return new Set(draft.filter(c => !committed.has(`${c.id}:${c.verb}:${describe(c.criterion)}`)).map(c => c.id));
  }, [draft, clauses]);

  // Popover edits apply at once below the threshold and accumulate in a draft above it. Removing a
  // chip or switching its verb applies at once at any size.
  const setFromPopover = (next: IClause[]) => {
    if (!needsApply) {
      commit({ clauses: next });
      setDraft(null);
      return;
    }
    const removedIds = new Set(editing.filter(e => !next.some(c => c.id === e.id)).map(e => e.id));
    const verbSwitched = new Map(next.filter(c => editing.some(e => e.id === c.id && e.criterion === c.criterion && e.verb !== c.verb)).map(c => [c.id, c.verb]));
    if (removedIds.size || verbSwitched.size) {
      commit({ clauses: clauses.filter(c => !removedIds.has(c.id)).map(c => (verbSwitched.has(c.id) ? { ...c, verb: verbSwitched.get(c.id)! } : c)) });
    }
    setDraft(next);
  };
  const apply = () => {
    if (draft) commit({ clauses: draft });
    setDraft(null);
  };

  // The URL mirrors the state; an explicitly cleared filter writes an empty f= so the default does not return.
  const urlSearch = (() => {
    const base = writeUrl(uiFind, filter.source === 'url' ? clauses : null, filter.source === 'url' ? treeMode : null);
    const extra = [view === 'genai' ? 'view=genai' : '', threshold !== 10000 ? `threshold=${threshold}` : ''].filter(Boolean).join('&');
    if (!extra) return base;
    return base ? `${base}&${extra}` : `?${extra}`;
  })();
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${urlSearch}`);
  }, [urlSearch]);

  const highlightRows = rows.filter((r): r is Extract<Row, { kind: 'span' }> => r.kind === 'span' && evaluation.highlightIDs.has(r.span.id));
  const scrollTo = (id: string) => {
    setCursor(id);
    document.getElementById(`row-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const step = (delta: number) => {
    if (!highlightRows.length) return;
    const idx = highlightRows.findIndex(r => r.span.id === cursor);
    const next = highlightRows[(idx + delta + highlightRows.length) % highlightRows.length];
    scrollTo(next.span.id);
  };
  // Locate collapses every visible span with children that is not on the path to a highlighted span.
  const locate = () => {
    const keepOpen = new Set<string>();
    for (const id of evaluation.highlightIDs) {
      const span = trace.spans.find(s => s.id === id)!;
      ancestors(trace, span).forEach(a => keepOpen.add(a.id));
    }
    const all = buildRows(trace, evaluation.hiddenIDs, treeMode, new Set());
    setCollapsed(new Set(all.filter((r): r is Extract<Row, { kind: 'span' }> => r.kind === 'span' && r.hasChildren && !keepOpen.has(r.span.id)).map(r => r.span.id)));
    const first = all.find((r): r is Extract<Row, { kind: 'span' }> => r.kind === 'span' && evaluation.highlightIDs.has(r.span.id));
    if (first) setTimeout(() => scrollTo(first.span.id), 50);
  };
  const collapseAll = () => setCollapsed(new Set(buildRows(trace, evaluation.hiddenIDs, treeMode, new Set()).filter((r): r is Extract<Row, { kind: 'span' }> => r.kind === 'span' && r.hasChildren).map(r => r.span.id)));

  const convert = (verb: Verb) => {
    commit({ clauses: [...clauses, newClause(verb, { shape: 'text', text: uiFind.trim() })] });
    setUiFind('');
  };
  const hiddenCount = evaluation.hiddenIDs.size;
  const saveDefault = () => {
    localStorage.setItem(savedKey(view), writeUrl('', clauses, treeMode));
    setFilter(f => ({ ...f, source: 'saved' }));
  };

  const popoverContent = (
    <FilterPopover
      clauses={editing}
      setClauses={setFromPopover}
      pendingIds={pendingIds}
      treeMode={treeMode}
      setTreeMode={m => commit({ treeMode: m })}
      visibleCount={evaluation.visibleCount}
      needsApply={needsApply}
      onApply={apply}
      onSaveDefault={saveDefault}
    />
  );
  const filterButton = <FilterFunnel content={popoverContent} count={clauses.length} />;

  return (
    <>
      <div className="knobs">
        <b>Prototype controls</b>
        <span>
          View:{' '}
          <Segmented size="small" options={[{ label: 'Timeline', value: 'timeline' }, { label: 'GenAI', value: 'genai' }]} value={view} onChange={v => changeView(v as View)} />
        </span>
        <span>
          Immediate-apply threshold: <InputNumber size="small" min={0} value={threshold} onChange={v => setThreshold(Number(v ?? 0))} style={{ width: 90 }} /> spans (trace has {trace.spans.length}; set it below that to see the Apply button)
        </span>
        <span>Filter source: <b>{filter.source}</b></span>
        <a onClick={() => { localStorage.removeItem(savedKey(view)); setFilter(resolveDefault(view)); }}>Forget saved default</a>
      </div>
      <div className="url">{window.location.pathname}{urlSearch || '(no parameters)'}</div>
      <div className="header">
        <span className="title">
          Trace {fixture.traceID.slice(0, 7)} <small>{trace.spans.length} spans · {trace.services.length} services · <span className={totalErrors ? 'caption-err' : ''}>{totalErrors} error{totalErrors === 1 ? '' : 's'}</span> · {fmtDuration(trace.duration)}</small>
        </span>
        <div className="cluster">
          <Input
            allowClear
            size="small"
            style={{ width: 260 }}
            placeholder="Find…"
            prefix={<IoSearch color="#999" />}
            value={uiFind}
            onChange={e => { setUiFind(e.target.value); setCursor(null); }}
            onPressEnter={() => step(1)}
            suffix={
              uiFind.trim() ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'keep', icon: <IoEye className="keep" />, label: treeMode === 'lift' ? 'Keep matching spans' : <Tooltip title={KEEP_NEEDS_LIFT}>Keep matching spans</Tooltip>, disabled: treeMode !== 'lift', onClick: () => convert('keep') },
                      { key: 'hide', icon: <IoEyeOff className="hide" />, label: 'Hide matching spans', onClick: () => convert('hide') },
                    ],
                  }}
                >
                  <Tooltip title="Turn this text into a filter">
                    <span style={{ cursor: 'pointer', color: '#555', padding: '0 2px' }}>▾</span>
                  </Tooltip>
                </Dropdown>
              ) : (
                <span />
              )
            }
          />
          <span className="count">
            {uiFind.trim() || clauses.some(c => c.verb === 'find') ? evaluation.highlightIDs.size : ''}
            {hiddenCount > 0 && (
              <>
                {uiFind.trim() || clauses.some(c => c.verb === 'find') ? ' · ' : ''}
                <b>{hiddenCount} hidden</b>
              </>
            )}
          </span>
          <Tooltip title="Previous match"><Button size="small" icon={<IoChevronUp />} disabled={!highlightRows.length} onClick={() => step(-1)} /></Tooltip>
          <Tooltip title="Next match"><Button size="small" icon={<IoChevronDown />} disabled={!highlightRows.length} onClick={() => step(1)} /></Tooltip>
          <Tooltip title="Collapse the trace to the paths leading to the matching spans"><Button size="small" icon={<IoLocate />} disabled={!evaluation.highlightIDs.size} onClick={locate} /></Tooltip>
          {filterButton}
        </div>
      </div>
      <Timeline
        filterButton={filterButton}
        rows={rows}
        highlightIDs={evaluation.highlightIDs}
        currentId={cursor}
        collapsed={collapsed}
        toggleCollapse={id => setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
        onCollapseAll={collapseAll}
        onExpandAll={() => setCollapsed(new Set())}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
