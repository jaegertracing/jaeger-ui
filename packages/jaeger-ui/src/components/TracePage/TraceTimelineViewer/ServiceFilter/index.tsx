// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Checkbox, Popover, Radio, Tooltip } from 'antd';
import { IoClose, IoEye, IoEyeOff, IoFunnel, IoFunnelOutline } from 'react-icons/io5';

import colorGenerator from '../../../../utils/color-generator';
import { IOtelTrace } from '../../../../types/otel';
import {
  describeCriterion,
  hiddenServices,
  hidesEverySpan,
  IClause,
  ISpanFilter,
  spanFiltersEqual,
  TreeMode,
  Verb,
  withHiddenServices,
  normalizeFilter,
  KEEP_NEEDS_LIFT,
  LEAVES_NO_SPAN,
} from '../../spanFilter';

import './ServiceFilter.css';

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

// antd opens a tooltip on hover only, which leaves keyboard users without the text.
export const TOOLTIP_TRIGGERS: Array<'hover' | 'focus'> = ['hover', 'focus'];

// The popover keeps at least this height, and this much of the viewport stays free below it.
const POPOVER_MIN_HEIGHT = 120;
const POPOVER_MARGIN = 16;
// The arrow, the title and the padding that antd draws around the content, which the cap on the
// content must leave room for.
const POPOVER_CHROME = 65;

function VerbIcon({ verb }: { verb: Verb }) {
  return verb === 'keep' ? <IoEye aria-hidden /> : <IoEyeOff aria-hidden />;
}

/**
 * The funnel button and the filter popover of RFC 0009. The popover lists the active chips with
 * their verb, the tree mode, and the service list, and applies a change as it is made unless the
 * trace is larger than the apply threshold, in which case list edits wait for Apply. Removing a
 * chip, switching its verb or switching the tree mode applies at once at any size, together with
 * the list edits that are waiting.
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
  const protectRoots = editing.treeMode === 'remove';
  const lockedService = protectRoots && rootServices.size === 1 ? [...rootServices][0] : null;
  const pruned = useMemo(() => hiddenServices(editing), [editing]);

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
    const room = window.innerHeight - bottom - POPOVER_CHROME - POPOVER_MARGIN;
    setMaxHeight(Math.max(POPOVER_MIN_HEIGHT, room));
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
  const stage = useCallback((edit: Edit) => applyEdit(edit, true), [applyEdit]);
  const commitNow = useCallback((edit: Edit) => applyEdit(edit, false), [applyEdit]);

  const toggleService = useCallback(
    (name: string) => {
      // The sole root service cannot be hidden, but a draft that already hides it can show it again.
      if (name === lockedService && !pruned.has(name)) return;
      stage(f => {
        const next = new Set(hiddenServices(f));
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return withHiddenServices(f, next);
      });
    },
    [lockedService, pruned, stage]
  );

  const selectAll = useCallback(() => stage(f => withHiddenServices(f, new Set())), [stage]);
  const selectNone = useCallback(
    () =>
      stage(f =>
        withHiddenServices(f, new Set(serviceEntries.filter(s => s.name !== lockedService).map(s => s.name)))
      ),
    [lockedService, serviceEntries, stage]
  );

  const setTreeMode = useCallback((treeMode: TreeMode) => commitNow(f => ({ ...f, treeMode })), [commitNow]);
  const removeClause = useCallback(
    (clause: IClause) => commitNow(f => ({ ...f, clauses: f.clauses.filter(c => c !== clause) })),
    [commitNow]
  );
  const switchVerb = useCallback(
    (clause: IClause) =>
      commitNow(f => {
        const next = nextVerb(clause.verb, f.treeMode);
        return next ? { ...f, clauses: f.clauses.map(c => (c === clause ? { ...c, verb: next } : c)) } : f;
      }),
    [commitNow]
  );
  const clearAll = useCallback(() => commitNow(f => ({ ...f, clauses: [] })), [commitNow]);

  const apply = useCallback(() => {
    if (draft) onChange(draft);
    setDraft(null);
    setOpen(false);
  }, [draft, onChange]);

  const saveAsDefault = useCallback(() => {
    onChange(editing, { saveAsDefault: true });
    setDraft(null);
    setOpen(false);
  }, [editing, onChange]);

  const activeCount = filter.clauses.length;
  const visibleCount = trace.spans.length - hiddenCount;

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
                // The key leaves the verb out, so that a switch keeps the chip and the focus on it.
                return (
                  <span key={`${i}:${describeCriterion(clause.criterion)}`} className="SpanFilter--chip">
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
                        onClick={() => switchVerb(clause)}
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
        {serviceEntries.length > 1 && (
          <section className="SpanFilter--section" aria-label="Service">
            <div className="SpanFilter--sectionHeader">
              <span className="SpanFilter--sectionTitle">Service</span>
              <span className="SpanFilter--sectionActions">
                <Button size="small" type="link" onClick={selectAll}>
                  Select All
                </Button>
                <Button size="small" type="link" onClick={selectNone}>
                  Select None
                </Button>
              </span>
            </div>
            <div className="ServiceFilter--list" role="group" aria-label="Service visibility">
              {serviceEntries.map(({ name, numberOfSpans }) => {
                const isVisible = !pruned.has(name);
                const color = colorGenerator.getColorByKey(name);
                const isRoot = rootServices.has(name);
                return (
                  <div key={name} className="ServiceFilter--item">
                    <Checkbox
                      checked={isVisible}
                      disabled={name === lockedService && isVisible}
                      onChange={() => toggleService(name)}
                      aria-label={`${isVisible ? 'Hide' : 'Show'} ${name}`}
                    >
                      <span className="ServiceFilter--colorDot" style={{ backgroundColor: color }} />
                      <span className="ServiceFilter--serviceName" title={name}>
                        {name}
                      </span>
                      {isRoot && <span className="ServiceFilter--rootBadge">root</span>}
                      <span className="ServiceFilter--spanCount">
                        ({numberOfSpans} {numberOfSpans === 1 ? 'span' : 'spans'})
                      </span>
                    </Checkbox>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section className="SpanFilter--section" aria-label="Children of a hidden span">
          <div className="SpanFilter--sectionHeader">
            <span className="SpanFilter--sectionTitle">Children of a hidden span</span>
          </div>
          <Radio.Group value={editing.treeMode} onChange={e => setTreeMode(e.target.value as TreeMode)}>
            <Radio value="remove">Remove with it</Radio>
            <Radio value="lift">Lift to its parent</Radio>
          </Radio.Group>
        </section>
      </div>
      {warning && (
        <div className="ServiceFilter--warning" role="alert">
          {warning}
        </div>
      )}
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
      content={content}
      title="Filter spans"
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
