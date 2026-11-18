// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAttributes } from '../../../model/attributes';
import { AttributeValue, IOtelSpan } from '../../../types/otel';
import filterSpans from '../../../utils/filter-spans';
import {
  attributeMatchIDs,
  EMPTY_SPAN_FILTER,
  ISpanFilter,
  KEEP_NEEDS_LIFT,
  LEAVES_NO_SPAN,
  Verb,
} from '../spanFilter';
import { getSpanPillsForSpan, ISpanPill } from './spanDecorations';
import {
  ISpanPillActions,
  makeSpanPillActions,
  spanPillAttributeText,
  spanPillFindText,
  SpanPillActionsContext,
} from './spanPillActions';
import { SpanPill } from './spanPills';

vi.mock('../../../hooks/useConfig', () => ({ useConfig: () => ({}) }));

const NO_SPAN_IDS: ReadonlySet<string> = new Set();

const statusPill: ISpanPill = {
  label: 'http.status_code',
  attrKey: 'http.response.status_code',
  attrMatchText: '200',
  value: '200',
};

function makeSpan(
  spanID: string,
  attributes: ReadonlyArray<{ key: string; value: AttributeValue }>
): IOtelSpan {
  return {
    spanID,
    name: `op-${spanID}`,
    attributes: makeAttributes(attributes),
    events: [],
    resource: { serviceName: `service-${spanID}`, attributes: makeAttributes() },
  } as unknown as IOtelSpan;
}

describe('span pill texts', () => {
  it('builds the search text from the attribute key, not the pill label', () => {
    expect(spanPillFindText(statusPill)).toBe('http.response.status_code=200');
  });

  it('builds the attribute criterion text', () => {
    expect(spanPillAttributeText(statusPill)).toBe('http.response.status_code:200');
  });

  // Each value is one that the pill shows differently from how the search and the filter match it,
  // or one that the search syntax cannot spell in full.
  it.each([
    { name: 'a value with surrounding spaces', key: 'gen_ai.request.model', value: '  model-a  ' },
    { name: 'a value with a space inside', key: 'db.system', value: 'sql server' },
    { name: 'a value of bytes', key: 'db.system', value: new Uint8Array([1, 2, 3]) },
    {
      name: 'an array value, whose text holds double quotes',
      key: 'db.system',
      value: ['mysql', 'postgres'],
    },
    { name: 'a string value that holds a double quote', key: 'gen_ai.request.model', value: 'model "a" v2' },
  ])('finds, and filters on, the span of the pill alone for $name', ({ key, value }) => {
    const pillSpan = makeSpan('pill', [{ key, value }]);
    // The attribute of the other span holds fragments of the values above.
    const otherSpan = makeSpan('other', [
      { key: 'note', value: 'mysql, postgres, sql, server, model-a, a and v2' },
    ]);
    const spans = [pillSpan, otherSpan];
    const [pill] = getSpanPillsForSpan(pillSpan);

    expect(filterSpans(spanPillFindText(pill), spans)).toEqual(new Set(['pill']));
    expect(attributeMatchIDs(spans, spanPillAttributeText(pill))).toEqual(new Set(['pill']));
  });
});

describe('makeSpanPillActions', () => {
  const okSpan = makeSpan('ok', [{ key: 'http.response.status_code', value: '200' }]);
  const failedSpan = makeSpan('failed', [{ key: 'http.response.status_code', value: '503' }]);
  const spanWithoutStatus = makeSpan('plain', []);
  const trace = { spans: [okSpan, failedSpan, spanWithoutStatus], rootSpans: [spanWithoutStatus] };

  function makeActions(spanFilter: ISpanFilter = EMPTY_SPAN_FILTER, hiddenIDs = NO_SPAN_IDS) {
    const applyFilter = vi.fn();
    const setUiFind = vi.fn();
    const actions = makeSpanPillActions({ trace, spanFilter, hiddenIDs, applyFilter, setUiFind });
    return { actions, applyFilter, setUiFind };
  }

  it('find replaces the search text and leaves the filter alone', () => {
    const { actions, applyFilter, setUiFind } = makeActions();
    actions.applyVerb('find', statusPill);
    expect(setUiFind).toHaveBeenCalledWith('http.response.status_code=200');
    expect(applyFilter).not.toHaveBeenCalled();
  });

  it.each(['keep', 'hide'] as const)('%s appends an attribute clause to the existing clauses', verb => {
    const existingClause = { verb: 'hide' as const, criterion: { shape: 'text' as const, text: 'x' } };
    const { actions, applyFilter, setUiFind } = makeActions({ clauses: [existingClause], treeMode: 'lift' });
    actions.applyVerb(verb, statusPill);
    expect(applyFilter).toHaveBeenCalledWith({
      clauses: [
        existingClause,
        { verb, criterion: { shape: 'attr', text: 'http.response.status_code:200' } },
      ],
      treeMode: 'lift',
    });
    expect(setUiFind).not.toHaveBeenCalled();
  });

  it('enables every verb for a pill that some of the visible spans carry', () => {
    expect(makeActions().actions.disabledReasons(statusPill)).toEqual({ keep: null, hide: null });
  });

  it('disables keep in remove mode', () => {
    const { actions } = makeActions({ clauses: [], treeMode: 'remove' });
    expect(actions.disabledReasons(statusPill)).toEqual({ keep: KEEP_NEEDS_LIFT, hide: null });
  });

  it('does not count a match that the filter already hides', () => {
    const hiddenOkSpan = makeSpan('hidden-ok', [{ key: 'http.response.status_code', value: '200' }]);
    const actions = makeSpanPillActions({
      trace: { spans: [okSpan, hiddenOkSpan, spanWithoutStatus], rootSpans: [spanWithoutStatus] },
      spanFilter: EMPTY_SPAN_FILTER,
      hiddenIDs: new Set(['hidden-ok']),
      applyFilter: vi.fn(),
      setUiFind: vi.fn(),
    });
    // Two of the three spans match, and one of the two shown spans does, so hide leaves a span.
    expect(actions.disabledReasons(statusPill)).toEqual({ keep: null, hide: null });
  });

  it('disables hide when the pill matches every span that is still shown', () => {
    const { actions } = makeActions(EMPTY_SPAN_FILTER, new Set(['failed', 'plain']));
    expect(actions.disabledReasons(statusPill)).toEqual({ keep: null, hide: LEAVES_NO_SPAN });
  });
});

describe('<SpanPill> menu', () => {
  const FIND_LABEL = 'Find spans with this attribute';
  const KEEP_LABEL = 'Keep spans with this attribute';
  const HIDE_LABEL = 'Hide spans with this attribute';

  function renderPill(disabledReasons: Record<Verb, string | null> = { keep: null, hide: null }) {
    const actions: ISpanPillActions = {
      applyVerb: vi.fn(),
      disabledReasons: vi.fn(() => disabledReasons),
    };
    const onRowClick = vi.fn();
    const onRowKeyDown = vi.fn();
    render(
      <SpanPillActionsContext.Provider value={actions}>
        {/* The row link of SpanBarRow toggles the span detail on a click and on Enter. */}
        <a onClick={onRowClick} onKeyDown={onRowKeyDown}>
          <SpanPill pill={statusPill} />
        </a>
      </SpanPillActionsContext.Provider>
    );
    return { actions, onRowClick, onRowKeyDown, trigger: screen.getByRole('button') };
  }

  it('applies a verb through the actions of the latest render', () => {
    const firstActions: ISpanPillActions = {
      applyVerb: vi.fn(),
      disabledReasons: () => ({ keep: null, hide: null }),
    };
    const latestActions: ISpanPillActions = { ...firstActions, applyVerb: vi.fn() };
    const { rerender } = render(
      <SpanPillActionsContext.Provider value={firstActions}>
        <SpanPill pill={statusPill} />
      </SpanPillActionsContext.Provider>
    );
    fireEvent.click(screen.getByRole('button'));
    rerender(
      <SpanPillActionsContext.Provider value={latestActions}>
        <SpanPill pill={statusPill} />
      </SpanPillActionsContext.Provider>
    );
    fireEvent.click(screen.getByText(HIDE_LABEL));
    expect(latestActions.applyVerb).toHaveBeenCalledWith('hide', statusPill);
    expect(firstActions.applyVerb).not.toHaveBeenCalled();
  });

  it('lets the Escape key of the open menu through to the page', () => {
    const { onRowKeyDown, trigger } = renderPill();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByText(HIDE_LABEL), { key: 'Escape' });
    expect(onRowKeyDown).toHaveBeenCalled();
  });

  it('asks for the disabled reasons once, when the menu opens', () => {
    const { actions, trigger } = renderPill();
    expect(actions.disabledReasons).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(actions.disabledReasons).toHaveBeenCalledTimes(1);
    expect(actions.disabledReasons).toHaveBeenCalledWith(statusPill);
  });

  it.each([
    { verb: 'find', label: FIND_LABEL },
    { verb: 'keep', label: KEEP_LABEL },
    { verb: 'hide', label: HIDE_LABEL },
  ] as const)('applies $verb from the menu without a click on the row', ({ verb, label }) => {
    const { actions, onRowClick, trigger } = renderPill();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText(label));
    expect(actions.applyVerb).toHaveBeenCalledWith(verb, statusPill);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('neither applies a disabled verb nor passes its click to the row', () => {
    const { actions, onRowClick, trigger } = renderPill({ keep: KEEP_NEEDS_LIFT, hide: null });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText(KEEP_LABEL));
    expect(actions.applyVerb).not.toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('opens the menu on the key %j without a key press on the row', key => {
    const { onRowKeyDown, trigger } = renderPill();
    fireEvent.keyDown(trigger, { key });
    expect(screen.getByText(FIND_LABEL)).toBeInTheDocument();
    expect(onRowKeyDown).not.toHaveBeenCalled();
  });

  it('keeps a key press inside the open menu from the row', () => {
    const { onRowKeyDown, trigger } = renderPill();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByText(HIDE_LABEL), { key: ' ' });
    expect(onRowKeyDown).not.toHaveBeenCalled();
  });

  it('leaves other keys on the pill to the row', () => {
    const { onRowKeyDown, trigger } = renderPill();
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(screen.queryByText(FIND_LABEL)).not.toBeInTheDocument();
    expect(onRowKeyDown).toHaveBeenCalled();
  });
});
