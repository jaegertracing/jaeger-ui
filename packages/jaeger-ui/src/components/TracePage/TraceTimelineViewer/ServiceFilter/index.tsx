// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Input, Popover, Radio, Tooltip } from 'antd';
import { IoClose, IoEye, IoEyeOff, IoFunnel, IoFunnelOutline } from 'react-icons/io5';

import FacetList, { FacetRow, rowState } from './FacetList';
import RangeFacet from './RangeFacet';
import Section, { KeepControl, TOOLTIP_TRIGGERS } from './Section';

export { TOOLTIP_TRIGGERS };
import { formatTokenCount } from '../SpanDetail/GenAITab/genAiData';
import colorGenerator from '../../../../utils/color-generator';
import { formatDuration } from '../../../../utils/date';
import { IOtelTrace } from '../../../../types/otel';
import { Microseconds } from '../../../../types/units';
import {
  describeCriterion,
  encodeClause,
  hiddenServices,
  attributeMatchIDs,
  evaluateSpanFilter,
  hidesEverySpan,
  IClause,
  ISpanFilter,
  keepRange,
  setClauseValues,
  SetProperty,
  setValueLabel,
  spanFiltersEqual,
  traceFacets,
  TreeMode,
  Verb,
  normalizeFilter,
  KEEP_NEEDS_LIFT,
  LEAVES_NO_SPAN,
  NO_SPAN_MATCHES,
  withKeepRange,
  withKeptAndHidden,
} from '../../spanFilter';

import './ServiceFilter.css';

const ATTRIBUTE_HELP = (
  <div className="SpanFilter--helpText">
    <p>
      One <code>key:value</code> term, matched case-insensitively as a substring of each span or resource
      attribute written as <code>key:value</code>.
    </p>
    <ul>
      <li>
        <code>http.method:GET</code> matches key and value
      </li>
      <li>
        <code>http.method</code> matches any value of that key
      </li>
      <li>
        <code>:GET</code> matches the value, whatever the key
      </li>
      <li>
        <code>http.status_code:20</code> matches <code>200</code> and <code>201</code>: this is a substring
        match, not a comparison
      </li>
    </ul>
    <p>
      Unlike Find: one term only, no quotes, no <code>-key</code>, and span names, service names and events
      are not searched.
    </p>
  </div>
);

type SpanFilterButtonProps = {
  trace: IOtelTrace;
  filter: ISpanFilter;
  // The number of spans the filter hides, for the "N of M spans shown" count.
  hiddenCount: number;
  // Applies the filter and writes it to the URL; with saveAsDefault it also saves the service
  // selection for future traces.
  onChange: (filter: ISpanFilter, options?: { saveAsDefault?: boolean }) => void;
  // The span count above which a list edit waits for the Apply button.
  applyThreshold: number;
};

type Edit = (filter: ISpanFilter) => ISpanFilter;

// The verb a chip's icon switches to, or null when the switch is not allowed: a keep chip in remove
// mode would hide the root and with it the whole trace, so a hide chip stays hide in that mode.
function nextVerb(verb: Verb, treeMode: TreeMode): Verb | null {
  if (verb === 'keep') return 'hide';
  return treeMode === 'lift' ? 'keep' : null;
}

// The popover keeps at least this height, and this much of the viewport stays free below it.
const NO_IDS: ReadonlySet<string> = new Set();
const POPOVER_MIN_HEIGHT = 120;
const POPOVER_MARGIN = 16;
// The arrow, the title and the padding that antd draws around the content, which the cap on the
// content must leave spaceBelow for.
const POPOVER_FRAME_HEIGHT = 65;

function VerbIcon({ verb }: { verb: Verb }) {
  return verb === 'keep' ? <IoEye aria-hidden /> : <IoEyeOff aria-hidden />;
}

// The rows of a value list, largest count first, so that the list reads as a breakdown.
function countRows(property: SetProperty, counts: ReadonlyMap<string, number>): FacetRow[] {
  return [...counts]
    .map(([value, count]) => ({ value, label: setValueLabel(property, value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const formatMicros = (v: number) => formatDuration(v as Microseconds);
const formatTokens = (v: number) => formatTokenCount(v) ?? String(v);

// A facet over one value, or none, has nothing to choose from, and a range handle would only
// cut that value off, so the facet is drawn only when the sorted values differ on the axis, which
// starts at one.
function hasDistinctValues(values: ReadonlyArray<number>): boolean {
  return values[values.length - 1] > Math.max(values[0], 1);
}

/**
 * The funnel button and the filter popover of RFC 0009. The popover lists the active chips with
 * their verb, the tree mode, the duration, token and attribute controls and the status, span type,
 * kind and service lists, and applies a change as it is made unless the trace is larger than the apply threshold,
 * in which case the edits wait for Apply. Removing a chip, switching its verb or switching the
 * tree mode applies at once at any size, together with the edits that are waiting. The controls
 * that create a keep clause are disabled in remove mode, where a keep clause would hide the root
 * and with it the whole trace.
 */
export default function SpanFilterButton({
  trace,
  filter,
  hiddenCount,
  onChange,
  applyThreshold,
}: SpanFilterButtonProps) {
  const [open, setOpen] = useState(false);
  // The edits waiting for Apply, or null while every edit applies as it is made.
  const [draft, setDraft] = useState<ISpanFilter | null>(null);
  // A draft is a snapshot of the whole filter, so a filter committed elsewhere, such as by a refetch,
  // drops it rather than being overwritten by Apply.
  useEffect(() => setDraft(null), [filter]);
  const editing = draft ?? filter;
  const needsApply = trace.spans.length > applyThreshold;

  const facets = traceFacets(trace.spans);
  const serviceEntries = useMemo(
    () => [...trace.services].sort((a, b) => a.name.localeCompare(b.name)),
    [trace.services]
  );

  // Services that own at least one root span.
  const rootServices = useMemo(() => {
    const names = new Set<string>();
    for (const span of trace.rootSpans) {
      names.add(span.resource.serviceName);
    }
    return names;
  }, [trace.rootSpans]);

  // Remove mode needs at least one root service visible, because hiding every root empties the
  // tree; lift mode does not, because a hidden root's children become roots.
  const keepAllowed = editing.treeMode === 'lift';
  const lockedService = !keepAllowed && rootServices.size === 1 ? [...rootServices][0] : null;

  // A filter that hides every service, or that leaves no span of the trace shown, empties the tree,
  // and the warning says which. The hide set is matched by name, because a URL can name a service
  // the trace does not have. The whole filter is evaluated over the trace, because the clauses
  // together can hide every span while no one of them does: a keep clause and a hidden service in
  // lift mode, or a hidden root in remove mode.
  const warningFor = useCallback(
    (f: ISpanFilter): string => {
      const hidden = hiddenServices(f);
      if (serviceEntries.length > 0 && serviceEntries.every(s => hidden.has(s.name))) {
        return 'At least one service must be visible';
      }
      return hidesEverySpan(trace.spans, f) ? LEAVES_NO_SPAN : '';
    },
    [serviceEntries, trace.spans]
  );

  const warning = warningFor(editing);
  const invalid = warning !== '';

  // The popover opens below the funnel and never flips above it, because the column header sits
  // where nothing above it can scroll into view. Its content is capped to the space under the
  // button, measured when it opens and when the window resizes, and scrolls inside when the
  // controls need more.
  const buttonRef = useRef<HTMLSpanElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>();
  const measure = useCallback(() => {
    if (!buttonRef.current) return;
    const bottom = buttonRef.current.getBoundingClientRect().bottom;
    const spaceBelow = window.innerHeight - bottom - POPOVER_FRAME_HEIGHT - POPOVER_MARGIN;
    setMaxHeight(Math.max(POPOVER_MIN_HEIGHT, spaceBelow));
  }, []);
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setDraft(null);
      if (nextOpen) measure();
      setOpen(nextOpen);
    },
    [measure]
  );
  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, measure]);
  // The funnel's own tooltip closes while the popover is open, so that Escape reaches the popover.
  const [tipOpen, setTipOpen] = useState(false);

  // Every edit acts on the filter as shown, so the edits waiting for Apply go with it. An edit that
  // would empty the tree stays in the draft at any size, so that the warning can show. A list edit
  // waits above the threshold; a draft equal to the committed filter is dropped, so that Apply has
  // nothing to do. A chip edit, a tree-mode switch and Clear all apply at once at any size; a chip
  // is the clause object the popover rendered, which is why the edit needs no matching.
  const applyEdit = useCallback(
    (edit: Edit, waits: boolean) => {
      const next = normalizeFilter(edit(editing));
      if ((waits && needsApply) || warningFor(next) !== '') {
        setDraft(spanFiltersEqual(next, filter) ? null : next);
      } else {
        setDraft(null);
        if (!spanFiltersEqual(next, filter)) onChange(next);
      }
    },
    [editing, filter, needsApply, onChange, warningFor]
  );
  const applyOrDraft = useCallback((edit: Edit) => applyEdit(edit, true), [applyEdit]);
  const commitNow = useCallback((edit: Edit) => applyEdit(edit, false), [applyEdit]);

  // The row actions of a value list. The crossed-out eye hides a visible value and shows a hidden
  // one. With a keep clause on the property, a value is shown by adding it to the keep clause and
  // hidden by taking it out, and hiding the last kept value turns the keep clause into a hide
  // clause on every value, so that the rows keep the state they showed. The eye keeps only that
  // value, replacing the property's clauses, and a second click on it clears the keep clause
  // again. Clear removes both clauses.
  const toggleHidden = useCallback(
    (property: SetProperty, value: string) =>
      applyOrDraft(f => {
        const hidden = setClauseValues(f, 'hide', property);
        const kept = setClauseValues(f, 'keep', property);
        if (rowState(hidden, kept, value).isHidden) {
          hidden.delete(value);
          if (kept.size > 0) kept.add(value);
          // A keep clause that names every value of the trace keeps nothing out, so it goes.
          if ([...facets.values[property].keys()].every(v => kept.has(v))) kept.clear();
        } else {
          // Only the kept values that the trace has count as kept rows; a URL clause may name
          // others.
          const keptRows = [...kept].filter(v => facets.values[property].has(v)).length;
          if (keptRows > 1) {
            kept.delete(value);
          } else if (keptRows === 1) {
            kept.clear();
            facets.values[property].forEach((_, v) => hidden.add(v));
          } else {
            hidden.add(value);
          }
        }
        return withKeptAndHidden(f, property, kept, hidden);
      }),
    [facets, applyOrDraft]
  );
  const keepOnly = useCallback(
    (property: SetProperty, value: string) =>
      applyOrDraft(f => {
        const kept = setClauseValues(f, 'keep', property);
        const { isOnly } = rowState(new Set(), kept, value);
        return withKeptAndHidden(f, property, isOnly ? new Set() : new Set([value]), new Set());
      }),
    [applyOrDraft]
  );
  const clearProperty = useCallback(
    (property: SetProperty) => applyOrDraft(f => withKeptAndHidden(f, property, new Set(), new Set())),
    [applyOrDraft]
  );
  const [attribute, setAttribute] = useState('');
  const attributeText = attribute.trim();
  const withAttribute = useCallback(
    (f: ISpanFilter, verb: Verb): ISpanFilter => ({
      ...f,
      clauses: [...f.clauses, { verb, criterion: { shape: 'attr', text: attributeText } }],
    }),
    [attributeText]
  );
  // The eyes are disabled before the click, because an attribute that matches nothing has no edit
  // that would make the clause valid afterwards. A text that matches no span disables both eyes:
  // keeping it would empty the tree and hiding it would change nothing. A text that matches some
  // spans disables an eye only when its clause, with the draft's clauses, leaves no span shown. The
  // text is matched once per keystroke, and the draft's hidden set is evaluated once per draft, so
  // the two eyes cost a set walk each rather than a second and third pass over the attributes.
  const attributeMatches = useMemo(
    () => (attributeText ? attributeMatchIDs(trace.spans, attributeText) : NO_IDS),
    [attributeText, trace.spans]
  );
  const draftHidden = useMemo(
    () => (attributeText ? evaluateSpanFilter(trace.spans, editing).hiddenIDs : NO_IDS),
    [attributeText, editing, trace.spans]
  );
  const attributeReason = useCallback(
    (verb: Verb): string | null => {
      if (verb === 'keep' && !keepAllowed) return KEEP_NEEDS_LIFT;
      if (!attributeText) return null;
      if (attributeMatches.size === 0) return NO_SPAN_MATCHES;
      let visibleMatches = 0;
      attributeMatches.forEach(id => {
        if (!draftHidden.has(id)) visibleMatches += 1;
      });
      if (verb === 'keep') return visibleMatches === 0 ? LEAVES_NO_SPAN : null;
      if (editing.treeMode === 'remove') {
        // A hidden root has no subtree on screen, and a matching root takes its subtree with it.
        const everyRoot = trace.rootSpans.every(
          span => draftHidden.has(span.spanID) || attributeMatches.has(span.spanID)
        );
        return everyRoot ? LEAVES_NO_SPAN : null;
      }
      return visibleMatches === trace.spans.length - draftHidden.size ? LEAVES_NO_SPAN : null;
    },
    [attributeMatches, attributeText, draftHidden, editing.treeMode, keepAllowed, trace]
  );
  const attributeKeepReason = attributeReason('keep');
  const attributeHideReason = attributeReason('hide');
  const addAttribute = useCallback(
    (verb: Verb) => {
      if (!attributeText || attributeReason(verb)) return;
      applyOrDraft(f => withAttribute(f, verb));
      setAttribute('');
    },
    [attributeText, attributeReason, applyOrDraft, withAttribute]
  );

  const setTreeMode = useCallback((treeMode: TreeMode) => commitNow(f => ({ ...f, treeMode })), [commitNow]);
  const removeClause = useCallback(
    (clause: IClause) => commitNow(f => ({ ...f, clauses: f.clauses.filter(c => c !== clause) })),
    [commitNow]
  );
  // A switched chip keeps its place, so that it does not move under the pointer. A range chip that
  // switches to keep replaces the keep range of the same property, because the slider draws one
  // keep range per property; hide ranges combine, so a switch to hide leaves them in place.
  const switchVerb = useCallback(
    (clause: IClause) =>
      commitNow(f => {
        const next = nextVerb(clause.verb, f.treeMode);
        if (!next) return f;
        const isDisplacedKeepRange = (c: IClause) =>
          c !== clause &&
          next === 'keep' &&
          c.verb === 'keep' &&
          c.criterion.shape === 'range' &&
          clause.criterion.shape === 'range' &&
          c.criterion.property === clause.criterion.property;
        return {
          ...f,
          clauses: f.clauses
            .filter(c => !isDisplacedKeepRange(c))
            .map(c => (c === clause ? { ...c, verb: next } : c)),
        };
      }),
    [commitNow]
  );
  // Clear all closes the popover, because it is used to see the trace without its filters rather than
  // to build new ones.
  const clearAll = useCallback(() => {
    commitNow(f => ({ ...f, clauses: [] }));
    setOpen(false);
  }, [commitNow]);
  // A chip's key is its encoded criterion, without the verb or the position, so that a switch keeps
  // the chip and the focus on it even when it removes a clause before it. The encoded form is used
  // rather than the label, because two ranges can round to the same label. A criterion that appears
  // twice, under both verbs, gets a counter.
  const chipKeys = useMemo(() => {
    const seen = new Map<string, number>();
    return editing.clauses.map(clause => {
      const text = encodeClause(clause).replace(/^[^:]*:/, '');
      const n = seen.get(text) ?? 0;
      seen.set(text, n + 1);
      return n ? `${text}#${n}` : text;
    });
  }, [editing.clauses]);

  const apply = useCallback(() => {
    if (draft) onChange(draft);
    setDraft(null);
    setOpen(false);
  }, [draft, onChange]);

  // The saved default is the hidden services, so a keep clause on service is saved as the hide
  // clause on the services it leaves out.
  const saveAsDefault = useCallback(() => {
    const kept = setClauseValues(editing, 'keep', 'service');
    const hidden = setClauseValues(editing, 'hide', 'service');
    if (kept.size > 0) serviceEntries.forEach(s => !kept.has(s.name) && hidden.add(s.name));
    onChange(kept.size > 0 ? withKeptAndHidden(editing, 'service', new Set(), hidden) : editing, {
      saveAsDefault: true,
    });
    setDraft(null);
    setOpen(false);
  }, [editing, onChange, serviceEntries]);

  const activeCount = filter.clauses.length;
  const visibleCount = trace.spans.length - hiddenCount;

  const facetList = (property: SetProperty, title: string, rows: FacetRow[]) => (
    <FacetList
      title={title}
      rows={rows}
      hidden={setClauseValues(editing, 'hide', property)}
      kept={setClauseValues(editing, 'keep', property)}
      keepAllowed={keepAllowed}
      onToggleHidden={value => toggleHidden(property, value)}
      onOnly={value => keepOnly(property, value)}
      onClear={() => clearProperty(property)}
    />
  );
  const serviceRows: FacetRow[] = serviceEntries.map(({ name }) => ({
    value: name,
    label: name,
    count: facets.values.service.get(name) ?? 0,
    color: colorGenerator.getColorByKey(name),
    badge: rootServices.has(name) ? 'root' : undefined,
    // The sole root service cannot be hidden, but a draft that already hides it can show it again.
    locked: name === lockedService,
  }));
  const statusRows = countRows('status', facets.values.status);
  const spanTypeRows = countRows('spanType', facets.values.spanType);
  const kindRows = countRows('kind', facets.values.kind);
  const attributeEye = (verb: Verb, reason: string | null) => {
    const enabled = attributeText !== '' && !reason;
    return (
      <KeepControl allowed={!reason} reason={reason ?? undefined}>
        <button
          type="button"
          className={`FacetList--action is-${verb} ${enabled ? '' : 'is-disabled'}`}
          aria-label={verb === 'keep' ? 'Keep spans with it' : 'Hide spans with it'}
          aria-disabled={!enabled}
          onClick={() => addAttribute(verb)}
        >
          {verb === 'keep' ? <IoEye aria-hidden /> : <IoEyeOff aria-hidden />}
        </button>
      </KeepControl>
    );
  };

  const content = (
    <div
      className="SpanFilter--popover"
      role="dialog"
      aria-label="Filter spans"
      style={{ maxHeight }}
      // antd closes only the topmost portal on Escape, which is a tooltip when a chip button has the
      // focus, so the popover closes itself on Escape from anywhere inside it.
      onKeyDown={e => {
        if (e.key === 'Escape') handleOpenChange(false);
      }}
    >
      {warning && (
        <div className="ServiceFilter--warning" role="alert">
          {warning}
        </div>
      )}
      <div className="SpanFilter--body">
        {editing.clauses.length > 0 && (
          <section className="SpanFilter--section" aria-label="Active filters">
            <div className="SpanFilter--sectionHeader">
              <span className="SpanFilter--sectionTitle">Active filters</span>
              <span className="SpanFilter--sectionActions">
                {draft === null && (
                  <span className="SpanFilter--shownCount">
                    {visibleCount} of {trace.spans.length} spans shown
                  </span>
                )}
                <Button size="small" type="link" onClick={clearAll}>
                  Clear all
                </Button>
              </span>
            </div>
            <div className="SpanFilter--chips">
              {editing.clauses.map((clause, i) => {
                const next = nextVerb(clause.verb, editing.treeMode);
                return (
                  <span key={chipKeys[i]} className="SpanFilter--chip">
                    <Tooltip
                      title={next ? `${clause.verb}; click to switch to ${next}` : KEEP_NEEDS_LIFT}
                      trigger={TOOLTIP_TRIGGERS}
                    >
                      <button
                        type="button"
                        className={`SpanFilter--chipVerb is-${clause.verb} ${next ? '' : 'is-disabled'}`}
                        aria-label={
                          next ? `${clause.verb}, switch to ${next}` : `${clause.verb}, cannot switch`
                        }
                        aria-disabled={!next}
                        onClick={() => next && switchVerb(clause)}
                      >
                        <VerbIcon verb={clause.verb} />
                      </button>
                    </Tooltip>
                    <span className="SpanFilter--chipText">{describeCriterion(clause.criterion)}</span>
                    <button
                      type="button"
                      className="SpanFilter--chipRemove"
                      aria-label={`Remove ${describeCriterion(clause.criterion)}`}
                      onClick={() => removeClause(clause)}
                    >
                      <IoClose aria-hidden />
                    </button>
                  </span>
                );
              })}
            </div>
          </section>
        )}
        {statusRows.length > 1 && facetList('status', 'Status', statusRows)}
        {hasDistinctValues(facets.ranges.duration) && (
          <RangeFacet
            title="Span duration"
            values={facets.ranges.duration}
            range={keepRange(editing, 'duration')}
            format={formatMicros}
            keepAllowed={keepAllowed}
            onChange={range => applyOrDraft(f => withKeepRange(f, 'duration', range))}
          />
        )}
        {hasDistinctValues(facets.ranges.tokens) && (
          <RangeFacet
            title="Span tokens"
            values={facets.ranges.tokens}
            range={keepRange(editing, 'tokens')}
            format={formatTokens}
            keepAllowed={keepAllowed}
            onChange={range => applyOrDraft(f => withKeepRange(f, 'tokens', range))}
          />
        )}
        <Section title="Attribute contains" help={ATTRIBUTE_HELP}>
          <div className="SpanFilter--attribute">
            <Input
              size="small"
              placeholder="key:value"
              value={attribute}
              onChange={e => setAttribute(e.target.value)}
              onPressEnter={() => addAttribute('keep')}
              aria-label="Attribute contains"
            />
            {attributeEye('keep', attributeKeepReason)}
            {attributeEye('hide', attributeHideReason)}
          </div>
        </Section>
        {spanTypeRows.length > 1 && facetList('spanType', 'GenAI span type', spanTypeRows)}
        {kindRows.length > 1 && facetList('kind', 'Span kind', kindRows)}
        {serviceRows.length > 1 && facetList('service', 'Service', serviceRows)}
        <Section title="Children of a hidden span" collapsible={false}>
          <Radio.Group value={editing.treeMode} onChange={e => setTreeMode(e.target.value as TreeMode)}>
            <Radio value="remove">Remove with it</Radio>
            <Radio value="lift">Lift to its parent</Radio>
          </Radio.Group>
        </Section>
      </div>
      <div className="ServiceFilter--footer">
        <Button
          size="small"
          disabled={invalid}
          onClick={saveAsDefault}
          title="Apply and save the service selection as the default for future traces"
        >
          Save as Default
        </Button>
        {needsApply && (
          <Button type="primary" size="small" disabled={invalid || draft === null} onClick={apply}>
            Apply
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      classNames={{ root: 'SpanFilter--popoverRoot' }}
      content={content}
      title={<span className="SpanFilter--title">Filter spans</span>}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomLeft"
      // antd forces the vertical flip back on for an object autoAdjustOverflow on a bottomLeft
      // placement, and false would drop the horizontal adjust too, so the flip is switched off
      // through the alignment itself.
      align={{ overflow: { adjustX: true, adjustY: false } }}
    >
      <Tooltip
        title="Filter spans"
        trigger={TOOLTIP_TRIGGERS}
        open={tipOpen && !open}
        onOpenChange={setTipOpen}
      >
        <Badge count={activeCount} size="small" offset={[2, -2]} className="SpanFilter--badge">
          <span
            ref={buttonRef}
            className={`ServiceFilter--button ${activeCount > 0 ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={activeCount > 0 ? 'Span filter active' : 'Filter spans'}
            aria-pressed={activeCount > 0}
            data-testid="span-filter-button"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenChange(!open);
              } else if (e.key === 'Escape' && open) {
                // A hovered chip tooltip is the topmost portal, so antd would close only that.
                handleOpenChange(false);
              }
            }}
          >
            {activeCount > 0 ? <IoFunnel /> : <IoFunnelOutline />}
          </span>
        </Badge>
      </Tooltip>
    </Popover>
  );
}
