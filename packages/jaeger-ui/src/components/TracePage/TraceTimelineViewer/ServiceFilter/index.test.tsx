// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SpanFilterButton from './index';
import { makeAttributes } from '../../../../model/attributes';
import { IAttribute, IOtelTrace, IOtelSpan, SpanKind, StatusCode } from '../../../../types/otel';
import { Microseconds } from '../../../../types/units';
import {
  EMPTY_SPAN_FILTER,
  IClause,
  ISpanFilter,
  KEEP_NEEDS_LIFT,
  LEAVES_NO_SPAN,
  NO_SPAN_MATCHES,
  withHiddenServices,
} from '../../spanFilter';

type SpanOverrides = Partial<Omit<IOtelSpan, 'attributes'>> & { attrs?: IAttribute[] };

function makeSpan(spanID: string, serviceName: string, overrides: SpanOverrides = {}): IOtelSpan {
  const { attrs = [], ...rest } = overrides;
  return {
    spanID,
    name: `op-${spanID}`,
    kind: SpanKind.INTERNAL,
    status: { code: StatusCode.UNSET },
    duration: 1000,
    attributes: makeAttributes(attrs),
    resource: { serviceName, attributes: makeAttributes([]) },
    ...rest,
  } as unknown as IOtelSpan;
}

// The spans are dealt round-robin to the services, with durations that grow by one millisecond, so
// that the service list, the duration histogram and the shown count have something to show. The
// first spans are the roots, one per root service, and the rest are their children dealt
// round-robin, so that the filter is evaluated over a tree.
function makeTrace(serviceNames: string[], rootServiceNames?: string[], spanCount = 5): IOtelTrace {
  const roots = rootServiceNames ?? [serviceNames[0]];
  const spans = Array.from({ length: spanCount }, (_, i) =>
    makeSpan(`s${i}`, roots[i] ?? serviceNames[i % serviceNames.length], {
      duration: ((i + 1) * 1000) as Microseconds,
    })
  );
  const rootSpans = spans.slice(0, roots.length);
  spans.slice(roots.length).forEach((span, i) => {
    (span as { parentSpan?: IOtelSpan }).parentSpan = rootSpans[i % rootSpans.length];
  });
  const services = serviceNames.map(name => ({
    name,
    numberOfSpans: spans.filter(s => s.resource.serviceName === name).length,
  }));
  return { services, rootSpans, spans, isGenAITrace: false } as unknown as IOtelTrace;
}

// The crossed-out eye of every value row, in list order.
// The eye of each list row; the attribute section's "Hide spans with it" is not a row.
const hideButtons = () =>
  screen
    .getAllByRole('button', { name: /^(Hide|Show) / })
    .filter(b => !/ spans with it$/.test(b.getAttribute('aria-label') ?? ''));
const visibleTooltip = () => document.querySelector('.ant-tooltip:not(.ant-tooltip-hidden)');

// The slider moves a handle on key down and reports the change complete on key up.
const LEFT = 37;
const RIGHT = 39;
const press = (handle: HTMLElement, keyCode: number) => {
  fireEvent.keyDown(handle, { keyCode });
  fireEvent.keyUp(handle, { keyCode });
};

// A trace whose second span has an error status, so that a status clause has something to keep.
function withErrorSpan(trace: IOtelTrace): IOtelTrace {
  (trace.spans[1] as { status: { code: StatusCode } }).status = { code: StatusCode.ERROR };
  return trace;
}

// A trace whose span at the index carries the attribute, so that an attribute clause has something to keep.
function withAttribute(trace: IOtelTrace, key: string, value: string, index = 1): IOtelTrace {
  (trace.spans[index] as { attributes: IOtelSpan['attributes'] }).attributes = makeAttributes([
    { key, value },
  ]);
  return trace;
}

const hideServices = (...names: string[]) => withHiddenServices(EMPTY_SPAN_FILTER, new Set(names));
const REMOVE_FILTER: ISpanFilter = { ...EMPTY_SPAN_FILTER, treeMode: 'remove' };
const removeHiding = (...names: string[]) => withHiddenServices(REMOVE_FILTER, new Set(names));
const keepErrors: ISpanFilter = {
  clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } }],
  treeMode: 'lift',
};

describe('SpanFilterButton', () => {
  let onChange: ReturnType<
    typeof vi.fn<(filter: ISpanFilter, options?: { saveAsDefault?: boolean }) => void>
  >;

  // Holds the filter the way the page does, so that a sequence of edits sees its own results.
  function Stateful({
    trace,
    applyThreshold = 1000,
    filter: initial = EMPTY_SPAN_FILTER,
    treeMode,
  }: {
    trace: IOtelTrace;
    applyThreshold?: number;
    filter?: ISpanFilter;
    treeMode?: ISpanFilter['treeMode'];
  }) {
    const [filter, setFilter] = React.useState(treeMode ? { ...initial, treeMode } : initial);
    return (
      <SpanFilterButton
        trace={trace}
        filter={filter}
        hiddenCount={0}
        onChange={(...args) => {
          onChange(...args);
          setFilter(args[0]);
        }}
        applyThreshold={applyThreshold}
      />
    );
  }

  // A high threshold applies every edit at once; a zero threshold makes every edit wait for Apply.
  function renderButton(trace: IOtelTrace, filter = EMPTY_SPAN_FILTER, applyThreshold = 1000) {
    return render(
      <SpanFilterButton
        trace={trace}
        filter={filter}
        hiddenCount={0}
        onChange={onChange}
        applyThreshold={applyThreshold}
      />
    );
  }

  async function open() {
    fireEvent.click(screen.getByTestId('span-filter-button'));
    await waitFor(() => screen.getByRole('dialog'));
  }

  beforeEach(() => {
    onChange = vi.fn();
    localStorage.clear();
  });

  it('renders the button for single-service traces, because chips and the tree mode still apply', () => {
    renderButton(makeTrace(['only-svc']));
    expect(screen.getByTestId('span-filter-button')).toBeInTheDocument();
  });

  it('renders the filter button for multi-service traces', () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    expect(screen.getByTestId('span-filter-button')).toBeInTheDocument();
  });

  it('shows active style and the chip count when filter is active', () => {
    renderButton(makeTrace(['svc-a', 'svc-b']), hideServices('svc-b'));
    expect(screen.getByTestId('span-filter-button')).toHaveClass('is-active');
    expect(screen.getByTestId('span-filter-button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('1')).toHaveClass('ant-badge-count');
  });

  it('shows inactive style when no filter', () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    expect(screen.getByTestId('span-filter-button')).not.toHaveClass('is-active');
  });

  it('opens popover with service list on click', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    await open();
    expect(screen.getByText('svc-a')).toBeInTheDocument();
    expect(screen.getByText('svc-b')).toBeInTheDocument();
    expect(hideButtons()).toHaveLength(2);
  });

  it('omits the service list for a single-service trace', async () => {
    renderButton(makeTrace(['only-svc']));
    await open();
    expect(screen.queryByRole('button', { name: /^Hide only-svc/ })).toBeNull();
    expect(screen.getByText('Children of a hidden span')).toBeInTheDocument();
  });

  it('shows root badge for root service', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    await open();
    expect(screen.getAllByText('root')).toHaveLength(1);
  });

  it('opens popover via keyboard (Enter)', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    fireEvent.keyDown(screen.getByTestId('span-filter-button'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Filter spans')).toBeInTheDocument());
  });

  it('opens popover via keyboard (Space)', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    fireEvent.keyDown(screen.getByTestId('span-filter-button'), { key: ' ' });
    await waitFor(() => expect(screen.getByText('Filter spans')).toBeInTheDocument());
  });

  it('sets title attribute on service names for truncation tooltip', async () => {
    const long = 'very-long-service-name-that-should-be-truncated';
    renderButton(makeTrace([long, 'svc-b']));
    await open();
    expect(screen.getByText(long)).toHaveAttribute('title', long);
  });

  describe('immediate apply below the threshold', () => {
    it('applies a hide action as it is made and renders no Apply button', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']));
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b'));
      expect(screen.queryByText('Apply')).toBeNull();
    });

    it('holds an edit that would hide every service and shows the warning instead of applying it', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b'])} />);
      await open();
      fireEvent.click(hideButtons()[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      fireEvent.click(hideButtons()[1]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('At least one service must be visible');
      expect(screen.getByText('Save as Default').closest('button')).toBeDisabled();
    });

    it('holds an edit that would hide every root service in remove mode', async () => {
      render(
        <Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])} filter={REMOVE_FILTER} />
      );
      await open();
      fireEvent.click(hideButtons()[0]);
      expect(onChange).toHaveBeenLastCalledWith(removeHiding('svc-a'));
      fireEvent.click(hideButtons()[1]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('This filter would leave no span shown');
      // Re-checking svc-b brings the selection back to the applied filter, so there is nothing to apply.
      fireEvent.click(hideButtons()[1]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('deferred apply above the threshold', () => {
    it('applies at once at the threshold and waits one span above it', async () => {
      const { unmount } = renderButton(makeTrace(['svc-a', 'svc-b'], undefined, 5), EMPTY_SPAN_FILTER, 5);
      await open();
      expect(screen.queryByText('Apply')).toBeNull();
      fireEvent.click(hideButtons()[1]);
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b'));
      unmount();
      renderButton(makeTrace(['svc-a', 'svc-b'], undefined, 5), EMPTY_SPAN_FILTER, 4);
      await open();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    it('drops the draft when the filter is committed from elsewhere', async () => {
      const trace = makeTrace(['svc-a', 'svc-b', 'svc-c']);
      const { rerender } = renderButton(trace, EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      rerender(
        <SpanFilterButton
          trace={trace}
          filter={hideServices('svc-c')}
          hiddenCount={0}
          onChange={onChange}
          applyThreshold={0}
        />
      );
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      expect(screen.getByText('service: svc-c')).toBeInTheDocument();
      expect(hideButtons()[1]).not.toHaveClass('is-on');
    });

    it('accumulates hide actions until Apply', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      fireEvent.click(hideButtons()[2]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b', 'svc-c'));
    });

    it('has nothing to apply after a service is toggled off and back on', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('disables Apply until something changed and while the draft is invalid', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), { treeMode: 'lift', clauses: [] }, 0);
      await open();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      fireEvent.click(hideButtons()[0]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      // Hiding the other service too leaves no span, so the draft is invalid and cannot be applied.
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByRole('alert')).toHaveTextContent('At least one service must be visible');
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('removes a chip at once and applies the waiting list edits with it', async () => {
      const filter = withHiddenServices(keepErrors, new Set(['svc-c']));
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), filter, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove status: Error' }));
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ ...keepErrors, clauses: [] }, new Set(['svc-b', 'svc-c']))
      );
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });
  });

  it('saves a keep clause on service as the hide clause on the services it leaves out', async () => {
    render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} treeMode="lift" />);
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
    fireEvent.click(screen.getByText('Save as Default'));
    expect(onChange).toHaveBeenLastCalledWith(
      withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-a', 'svc-c'])),
      { saveAsDefault: true }
    );
  });

  it('applies with the saveAsDefault option when Save as Default is clicked', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
    await open();
    fireEvent.click(hideButtons()[1]);
    fireEvent.click(screen.getByText('Save as Default'));
    expect(onChange).toHaveBeenCalledWith(hideServices('svc-b'), { saveAsDefault: true });
  });

  it('caps the popover to the space under the button when it opens and when the window resizes', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    await open();
    // jsdom lays the button out at the top of the viewport, so the cap is the viewport minus the
    // popover's own chrome and the margin.
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ maxHeight: `${window.innerHeight - 65 - 16}px` });
    const height = window.innerHeight;
    try {
      window.innerHeight = 500;
      fireEvent(window, new Event('resize'));
      expect(dialog).toHaveStyle({ maxHeight: `${500 - 65 - 16}px` });
      // Below the floor the content keeps a usable height and the popover may overflow instead.
      window.innerHeight = 150;
      fireEvent(window, new Event('resize'));
      expect(dialog).toHaveStyle({ maxHeight: '120px' });
    } finally {
      window.innerHeight = height;
    }
  });

  it('closes the funnel tooltip while the popover is open', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    fireEvent.mouseEnter(screen.getByTestId('span-filter-button'));
    await waitFor(() =>
      expect(document.querySelector('.ant-tooltip:not(.ant-tooltip-hidden)')).not.toBeNull()
    );
    await open();
    await waitFor(() => expect(document.querySelector('.ant-tooltip:not(.ant-tooltip-hidden)')).toBeNull(), {
      timeout: 3000,
    });
  });

  it('closes on Escape from a chip button whose tooltip is open', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']), { ...keepErrors, treeMode: 'lift' });
    await open();
    const verb = screen.getByRole('button', { name: 'keep, switch to hide' });
    verb.focus();
    fireEvent.keyDown(verb, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.ant-popover:not(.ant-popover-hidden)')).toBeNull(), {
      timeout: 3000,
    });
  });

  it('closes on Escape from the funnel while a chip tooltip is hovered', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']), { ...keepErrors, treeMode: 'lift' });
    const funnel = screen.getByTestId('span-filter-button');
    funnel.focus();
    await open();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'keep, switch to hide' }));
    await waitFor(() =>
      expect(document.querySelector('.ant-tooltip:not(.ant-tooltip-hidden)')).not.toBeNull()
    );
    fireEvent.keyDown(funnel, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('.ant-popover:not(.ant-popover-hidden)')).toBeNull(), {
      timeout: 3000,
    });
  });

  it('keeps the warning above the scrolling sections and the footer below them', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']), { treeMode: 'lift', clauses: [] }, 0);
    await open();
    fireEvent.click(hideButtons()[0]);
    fireEvent.click(hideButtons()[1]);
    const alert = screen.getByRole('alert');
    expect(alert.closest('.SpanFilter--body')).toBeNull();
    const body = screen.getByText('Service').closest('.SpanFilter--body') as HTMLElement;
    expect(alert.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Save as Default').closest('.SpanFilter--body')).toBeNull();
    expect(screen.getByText('Service').closest('.SpanFilter--body')).not.toBeNull();
  });

  it('lists the tree mode last, under the service list', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b']));
    await open();
    const regions = within(screen.getByRole('dialog')).getAllByRole('region');
    expect(regions.at(-1)).toHaveAccessibleName('Children of a hidden span');
  });

  describe('chips', () => {
    it('keeps the focus on the verb button when it switches', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={keepErrors} />);
      await open();
      const verb = screen.getByRole('button', { name: 'keep, switch to hide' });
      verb.focus();
      fireEvent.click(verb);
      expect(screen.getByRole('button', { name: 'hide, switch to keep' })).toBe(document.activeElement);
    });

    it('keeps the focus and the place of a chip that switches verb among other chips', async () => {
      const text = (verb: 'keep' | 'hide', t: string): IClause => ({
        verb,
        criterion: { shape: 'text', text: t },
      });
      render(
        <Stateful
          trace={makeTrace(['svc-a', 'svc-b'])}
          filter={{ treeMode: 'lift', clauses: [text('hide', 'op-s1'), text('hide', 'op-s2')] }}
        />
      );
      await open();
      const verb = screen.getAllByRole('button', { name: 'hide, switch to keep' })[0];
      verb.focus();
      fireEvent.click(verb);
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [text('keep', 'op-s1'), text('hide', 'op-s2')],
      });
      expect(screen.getByRole('button', { name: 'keep, switch to hide' })).toBe(document.activeElement);
    });

    it('keeps the focus on a range chip that switches to keep and displaces an earlier keep range', async () => {
      const range = (verb: 'keep' | 'hide', min: number, max: number): IClause => ({
        verb,
        criterion: { shape: 'range', property: 'duration', min, max },
      });
      render(
        <Stateful
          trace={makeTrace(['svc-a', 'svc-b'])}
          filter={{ treeMode: 'lift', clauses: [range('keep', 0, 4000), range('hide', 2000, 3000)] }}
        />
      );
      await open();
      const verb = screen.getByRole('button', { name: 'hide, switch to keep' });
      verb.focus();
      fireEvent.click(verb);
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [range('keep', 2000, 3000)] });
      expect(screen.getByRole('button', { name: 'keep, switch to hide' })).toBe(document.activeElement);
    });

    it('keeps the focus on a switched range chip whose label rounds to that of the range it displaces', async () => {
      const range = (verb: 'keep' | 'hide', min: number, max: number): IClause => ({
        verb,
        criterion: { shape: 'range', property: 'duration', min, max },
      });
      render(
        <Stateful
          trace={makeTrace(['svc-a', 'svc-b'])}
          filter={{ treeMode: 'lift', clauses: [range('keep', 2001, 4001), range('hide', 2000, 4000)] }}
        />
      );
      await open();
      const verb = screen.getByRole('button', { name: 'hide, switch to keep' });
      verb.focus();
      fireEvent.click(verb);
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [range('keep', 2000, 4000)] });
      expect(screen.getByRole('button', { name: 'keep, switch to hide' })).toBe(document.activeElement);
    });

    it('switches the verb of a chip that exists only in the draft and applies the draft with it', async () => {
      const lift: ISpanFilter = { ...EMPTY_SPAN_FILTER, treeMode: 'lift' };
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), lift, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      expect(onChange).toHaveBeenCalledWith({
        ...lift,
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      });
    });

    it('holds a verb switch that would hide every service and shows the warning', async () => {
      const filter = withHiddenServices(
        {
          treeMode: 'lift',
          clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
        },
        new Set(['svc-a'])
      );
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('At least one service must be visible');
    });

    it('removes the committed service chip while the draft holds more services', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} applyThreshold={0} />);
      await open();
      fireEvent.click(hideButtons()[1]);
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenLastCalledWith(hideServices('svc-b'));
      await open();
      fireEvent.click(hideButtons()[2]);
      fireEvent.click(screen.getByRole('button', { name: /^Remove service/ }));
      expect(onChange).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
      expect(screen.queryByRole('button', { name: /^Remove service/ })).toBeNull();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('switches the verb of the service chip with the services a list edit added to it', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} applyThreshold={0} />);
      await open();
      fireEvent.click(hideButtons()[1]);
      fireEvent.click(screen.getByText('Apply'));
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      fireEvent.click(hideButtons()[2]);
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b', 'svc-c'] } },
        ],
      });
      fireEvent.click(screen.getByRole('button', { name: /^Remove service/ }));
      expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
    });

    it('adds a value shown from the list to the keep chip its property already has', async () => {
      const keep = (...values: string[]): IClause => ({
        verb: 'keep',
        criterion: { shape: 'set', property: 'service', values },
      });
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} />);
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      fireEvent.click(hideButtons()[1]);
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [keep('svc-b')] });
      fireEvent.click(screen.getByRole('button', { name: 'Show svc-c' }));
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [keep('svc-b', 'svc-c')] });
      expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
    });

    it('applies a chip removal together with the held edits once they are valid', async () => {
      const filter = withHiddenServices(
        { treeMode: 'lift', clauses: [{ verb: 'keep', criterion: { shape: 'text', text: 'foo' } }] },
        new Set(['svc-a'])
      );
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter, 0);
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      fireEvent.click(hideButtons()[0]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove text: foo' }));
      expect(onChange).toHaveBeenCalledWith({ treeMode: 'remove', clauses: [] });
    });

    it('edits only the chip clicked when two chips share a criterion with different verbs', async () => {
      const text = { shape: 'text', text: 'op-s' } as const;
      renderButton(makeTrace(['svc-a', 'svc-b']), {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: text },
          { verb: 'hide', criterion: text },
        ],
      });
      await open();
      fireEvent.click(screen.getAllByRole('button', { name: 'Remove text: op-s' })[1]);
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: text }],
      });
    });

    it('applies a set chip removal together with the held edits once they are valid', async () => {
      const hideErrors: ISpanFilter = {
        ...keepErrors,
        clauses: [{ ...keepErrors.clauses[0], verb: 'hide' }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b']), hideErrors, 0);
      await open();
      fireEvent.click(hideButtons()[0]);
      fireEvent.click(hideButtons()[1]);
      // The service chip that hiding added comes first; the status chip follows it.
      fireEvent.click(screen.getAllByRole('button', { name: 'hide, switch to keep' })[1]);
      fireEvent.click(hideButtons()[0]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove status: Error' }));
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-b']))
      );
    });

    it('applies the whole draft when a chip edit is valid only together with it', async () => {
      const filter = withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-a']));
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter, 0);
      await open();
      fireEvent.click(hideButtons()[0]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).toHaveBeenCalledWith(REMOVE_FILTER);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('hides the shown count while a draft waits for Apply', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a'], 5), keepErrors, 0);
      await open();
      expect(screen.getByText(/of 5 spans shown/)).toBeInTheDocument();
      fireEvent.click(hideButtons()[1]);
      expect(screen.queryByText(/of 5 spans shown/)).toBeNull();
    });

    it('applies nothing when a held mode switch is switched back', async () => {
      const filter = withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-a']));
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter);
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('drops the draft when the popover is closed and reopened', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(screen.getByTestId('span-filter-button'));
      await open();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      expect(hideButtons()[1]).not.toHaveClass('is-on');
    });

    it('merges a chip switched to hide into the service hide set', async () => {
      const filter = withHiddenServices(
        {
          treeMode: 'lift',
          clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
        },
        new Set(['svc-c'])
      );
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-b', 'svc-c']))
      );
    });

    it('lists the active clauses with the shown count and clears them all', async () => {
      render(
        <SpanFilterButton
          trace={makeTrace(['svc-a', 'svc-b'])}
          filter={withHiddenServices(keepErrors, new Set(['svc-b']))}
          hiddenCount={3}
          onChange={onChange}
          applyThreshold={1000}
        />
      );
      await open();
      expect(screen.getByText('status: Error')).toBeInTheDocument();
      expect(screen.getByText('service: svc-b')).toBeInTheDocument();
      expect(screen.getByText('2 of 5 spans shown')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Clear all'));
      expect(onChange).toHaveBeenCalledWith({ ...keepErrors, clauses: [] });
      // jsdom runs no animation, so the popover stays in its leave transition instead of becoming hidden.
      await waitFor(() =>
        expect(screen.getByRole('dialog').closest('.ant-popover')?.className).toMatch(
          /ant-popover-hidden|ant-zoom-big-leave/
        )
      );
    });

    it('does not render the section without clauses', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      expect(screen.queryByText('Active filters')).toBeNull();
    });

    it('toggles the verb keep → hide → keep in lift mode', async () => {
      const { rerender } = renderButton(withErrorSpan(makeTrace(['svc-a', 'svc-b'])), keepErrors);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).toHaveBeenLastCalledWith({
        ...keepErrors,
        clauses: [{ ...keepErrors.clauses[0], verb: 'hide' }],
      });
      const hidden = onChange.mock.calls[0][0] as ISpanFilter;
      rerender(
        <SpanFilterButton
          trace={withErrorSpan(makeTrace(['svc-a', 'svc-b']))}
          filter={hidden}
          hiddenCount={0}
          onChange={onChange}
          applyThreshold={1000}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      expect((onChange.mock.calls[1][0] as ISpanFilter).clauses[0].verb).toBe('keep');
    });

    it('does not switch a hide chip to keep in remove mode and says why', async () => {
      const hideErrors: ISpanFilter = {
        ...keepErrors,
        treeMode: 'remove',
        clauses: [{ ...keepErrors.clauses[0], verb: 'hide' }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), hideErrors, 0);
      await open();
      const verb = screen.getByRole('button', { name: 'hide, cannot switch' });
      expect(verb).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(verb);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.focus(verb);
      // The popover container is a tooltip too, so the reason is looked up by its text.
      await waitFor(() => expect(screen.getByText(/^Keep filters need/)).toBeInTheDocument());
      // A disabled verb button must not commit a draft that waits for Apply either.
      fireEvent.click(hideButtons()[1]);
      screen.getAllByRole('button', { name: 'hide, cannot switch' }).forEach(b => fireEvent.click(b));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('draft and committed filter', () => {
    it('applies a held draft as a whole when a chip edit makes it valid below the threshold', async () => {
      render(
        <Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])} filter={REMOVE_FILTER} />
      );
      await open();
      fireEvent.click(hideButtons()[0]);
      expect(onChange).toHaveBeenLastCalledWith(removeHiding('svc-a'));
      fireEvent.click(hideButtons()[1]);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      expect(onChange).toHaveBeenLastCalledWith({ ...hideServices('svc-a', 'svc-b'), treeMode: 'lift' });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText('Apply')).toBeNull();
    });

    it('lets a draft show the sole root service again after a switch to remove mode', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'], ['svc-a'])} applyThreshold={0} />);
      await open();
      fireEvent.click(hideButtons()[0]);
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('leave no span');
      const root = hideButtons()[0];
      expect(root).not.toBeDisabled();
      fireEvent.click(root);
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenLastCalledWith(REMOVE_FILTER);
    });

    it('judges a hide set by the trace services it names, not by its size', async () => {
      // Two foreign names hide nothing, however many services the trace has.
      const foreign: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['x', 'y'] } }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), foreign);
      await open();
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Remove service: x, y' }));
      expect(onChange).toHaveBeenCalledWith({ ...foreign, clauses: [] });
    });

    it('keeps one chip when a verb switch produces a copy of another clause', async () => {
      const text = { shape: 'text', text: 'foo' } as const;
      renderButton(makeTrace(['svc-a', 'svc-b']), {
        treeMode: 'remove',
        clauses: [
          { verb: 'hide', criterion: text },
          { verb: 'keep', criterion: text },
        ],
      });
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'remove',
        clauses: [{ verb: 'hide', criterion: text }],
      });
    });

    it('offers Clear only while the list has a chip, and clears it', async () => {
      const { unmount } = renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      expect(screen.queryByText('Clear')).toBeNull();
      unmount();
      renderButton(makeTrace(['svc-a', 'svc-b']), hideServices('svc-b'));
      await open();
      fireEvent.click(screen.getByText('Clear'));
      expect(onChange).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
    });
  });

  describe('tree mode', () => {
    it('holds a mode switch that the committed filter cannot take, and switches verbs by the shown mode', async () => {
      const filter: ISpanFilter = withHiddenServices(
        { treeMode: 'lift', clauses: [{ verb: 'keep', criterion: { shape: 'text', text: 'foo' } }] },
        new Set(['svc-a'])
      );
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter, 0);
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('leave no span');
      // The draft is in remove mode, where keep switches to hide and a hide chip cannot switch back;
      // the edit stays held with the draft.
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getAllByRole('button', { name: 'hide, cannot switch' })).toHaveLength(2);
    });

    it('holds a service edit that, with a keep clause, leaves no span in lift mode', async () => {
      // The text keeps one span of svc-b; hiding svc-b then leaves nothing, with svc-a still shown.
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'text', text: 'op-s1' } }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Hide svc-b' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('This filter would leave no span shown');
    });

    it('holds a mode switch when a keep chip would leave no root span in remove mode', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter);
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('This filter would leave no span shown');
      expect(screen.getByText('Save as Default').closest('button')).toBeDisabled();
    });

    it('switches the mode at once', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).toHaveBeenCalledWith(REMOVE_FILTER);
    });

    it('switches the mode at once above the threshold too', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).toHaveBeenCalledWith(REMOVE_FILTER);
    });
  });

  describe('single root service locking', () => {
    it('disables the hide action for the sole root service', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), REMOVE_FILTER);
      await open();
      const buttons = hideButtons();
      expect(buttons[0]).toBeDisabled();
      expect(buttons[1]).not.toBeDisabled();
      expect(buttons[2]).not.toBeDisabled();
    });

    it('leaves the sole root service selectable in lift mode', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      expect(hideButtons()[0]).not.toBeDisabled();
      fireEvent.click(hideButtons()[0]);
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' }, new Set(['svc-a']))
      );
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('does not lock root services when multiple root service names exist', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b']));
      await open();
      hideButtons().forEach(b => expect(b).not.toBeDisabled());
    });

    it('shows root badge on all root services when multiple exist', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b']));
      await open();
      expect(screen.getAllByText('root')).toHaveLength(2);
    });
  });

  describe('value lists', () => {
    const lift: ISpanFilter = { ...EMPTY_SPAN_FILTER, treeMode: 'lift' };

    it('shows the span count of each value as a bar', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b'], undefined, 3));
      await open();
      const list = screen.getByRole('group', { name: 'Service values' });
      expect(list).toHaveTextContent('svc-aroot2svc-b1');
    });

    it('keeps only the value of the eye action and clears it on the second click', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} filter={lift} />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      expect(onChange).toHaveBeenLastCalledWith({
        ...lift,
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      });
      expect(screen.getByRole('button', { name: 'Only svc-b' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      expect(onChange).toHaveBeenLastCalledWith(lift);
    });

    it('replaces a hide set by the keep set of the eye action', async () => {
      render(
        <Stateful
          trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
          filter={hideServices('svc-c')}
          treeMode="lift"
        />
      );
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      });
    });

    it('disables the eye action in remove mode with the tree mode tooltip on focus', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), REMOVE_FILTER);
      await open();
      const only = screen.getByRole('button', { name: 'Only svc-b' });
      expect(only).toHaveAttribute('aria-disabled', 'true');
      expect(only).not.toBeDisabled();
      fireEvent.click(only);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.focus(only);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(KEEP_NEEDS_LIFT));
    });

    it('lists span kinds only when the trace has more than one', async () => {
      const trace = makeTrace(['svc-a']);
      renderButton(trace);
      await open();
      expect(screen.queryByText('Span kind')).toBeNull();
      expect(screen.queryByText('GenAI span type')).toBeNull();
      const mixed = makeTrace(['svc-a']);
      (mixed.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      renderButton(mixed);
      fireEvent.click(screen.getAllByTestId('span-filter-button')[1]);
      await waitFor(() => screen.getByText('Span kind'));
      expect(screen.getByRole('group', { name: 'Span kind values' })).toHaveTextContent('Internal4');
      expect(screen.getByRole('group', { name: 'Span kind values' })).toHaveTextContent('Server1');
    });

    it('hides a span kind through its list', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[1] as { kind: SpanKind }).kind = SpanKind.SERVER;
      renderButton(trace);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Server' }));
      expect(onChange).toHaveBeenCalledWith({
        ...EMPTY_SPAN_FILTER,
        clauses: [{ verb: 'hide', criterion: { shape: 'set', property: 'kind', values: ['server'] } }],
      });
    });

    it('takes a value out of the keep clause when it is hidden', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} treeMode="lift" />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      fireEvent.click(screen.getByRole('button', { name: 'Show svc-c' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hide svc-b' }));
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-c'] } }],
      });
      expect(screen.getByRole('button', { name: 'Show svc-b' })).toHaveClass('is-on');
    });

    it('hides every value when the last kept value is hidden, so that the rows keep their state', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      (trace.spans[1] as { kind: SpanKind }).kind = SpanKind.CLIENT;
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only Server' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hide Server' }));
      // Every kind hidden leaves no span, so the hide chip on every value stays in the draft.
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('leave no span');
      expect(
        screen.getByRole('button', { name: 'Remove kind: Client, Internal, Server' })
      ).toBeInTheDocument();
      screen.getAllByRole('button', { name: /^Show / }).forEach(b => expect(b).toHaveClass('is-on'));
    });

    it('hides every value when the last kept value the trace has is hidden', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      (trace.spans[1] as { kind: SpanKind }).kind = SpanKind.CLIENT;
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'kind', values: ['server', 'zzz'] } }],
      };
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Server' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('leave no span');
      expect(
        screen.getByRole('button', { name: 'Remove kind: Client, Internal, Server' })
      ).toBeInTheDocument();
    });

    it('lets the sole root service be shown again when a keep clause leaves it out in remove mode', async () => {
      const filter: ISpanFilter = {
        treeMode: 'remove',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      const show = screen.getByRole('button', { name: 'Show svc-a' });
      expect(show).toBeEnabled();
      fireEvent.click(show);
      // Every service is kept, which keeps nothing out, so the clause goes.
      expect(onChange).toHaveBeenCalledWith({ treeMode: 'remove', clauses: [] });
    });

    it('shows a value that a keep clause leaves out by adding it to the keep clause', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} treeMode="lift" />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      const showA = screen.getByRole('button', { name: 'Show svc-a' });
      expect(showA).toHaveClass('is-on');
      fireEvent.click(showA);
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-a', 'svc-b'] } },
        ],
      });
    });

    it('waits for Apply above the threshold on Only', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' }, 0);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      });
    });

    it('lists the span types and the token histogram of a GenAI trace', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      const llm = makeSpan('llm', 'svc-a', {
        genAIKind: 'LLM_CALL',
        attrs: [
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 50 },
        ],
      });
      const tool = makeSpan('tool', 'svc-a', {
        genAIKind: 'TOOL_CALL',
        attrs: [{ key: 'gen_ai.usage.input_tokens', value: 2000 }],
      });
      (trace as unknown as { spans: IOtelSpan[] }).spans = [...trace.spans, llm, tool];
      renderButton(trace, { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      const types = screen.getByRole('group', { name: 'GenAI span type values' });
      expect(types).toHaveTextContent('Non-GenAI3');
      expect(types).toHaveTextContent('LLM call1');
      expect(types).toHaveTextContent('MCP Tool call1');
      expect(screen.getByText('Span tokens')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Only LLM call' })).toBeInTheDocument();
      const tokenSliders = within(screen.getByRole('region', { name: 'Span tokens' })).getAllByRole('slider');
      press(tokenSliders[1], LEFT);
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      expect(criterion).toMatchObject({ shape: 'range', property: 'tokens', min: 0 });
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.max).toBeGreaterThan(1900);
      expect(criterion.max).toBeLessThan(2000);
      onChange.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Non-GenAI' }));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'hide', criterion: { shape: 'set', property: 'spanType', values: ['none'] } }],
      });
    });

    it('binds a committed token range to the token handles and waits for Apply above the threshold', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      const llm = makeSpan('llm', 'svc-a', {
        genAIKind: 'LLM_CALL',
        attrs: [{ key: 'gen_ai.usage.input_tokens', value: 150 }],
      });
      const tool = makeSpan('tool', 'svc-a', {
        genAIKind: 'TOOL_CALL',
        attrs: [{ key: 'gen_ai.usage.input_tokens', value: 2000 }],
      });
      (trace as unknown as { spans: IOtelSpan[] }).spans = [...trace.spans, llm, tool];
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'tokens', min: 0, max: 1500 } }],
      };
      renderButton(trace, filter, 0);
      await open();
      const tokens = screen.getByRole('region', { name: 'Span tokens' });
      expect(tokens.querySelector('.RangeFacet--bounds')).toHaveTextContent('1501,500');
      expect(within(tokens).getByRole('slider', { name: 'Span tokens upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '1,500'
      );
      const duration = screen.getByRole('region', { name: 'Span duration' });
      expect(within(duration).getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuenow',
        '100'
      );
      press(within(tokens).getByRole('slider', { name: 'Span tokens upper bound' }), LEFT);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.property).toBe('tokens');
      expect(criterion.max).toBeLessThan(1500);
    });

    it('draws no token facet when every LLM call has the same token count', async () => {
      const trace = makeTrace(['svc-a'], undefined, 1);
      const usage = [{ key: 'gen_ai.usage.input_tokens', value: 150 }];
      const llm = makeSpan('llm', 'svc-a', { genAIKind: 'LLM_CALL', attrs: usage });
      const other = makeSpan('llm2', 'svc-a', { genAIKind: 'LLM_CALL', attrs: usage });
      (trace as unknown as { spans: IOtelSpan[] }).spans = [...trace.spans, llm, other];
      renderButton(trace, { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      expect(screen.queryByText('Span tokens')).toBeNull();
    });

    it('takes a shown value out of the hide clause as well as into the keep clause', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
          { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-a'] } },
        ],
      };
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Show svc-a' }));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-a', 'svc-b'] } },
        ],
      });
    });

    it('clears the keep clause on Clear', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'kind', values: ['server'] } }],
      };
      renderButton(trace, filter);
      await open();
      const kinds = within(screen.getByRole('region', { name: 'Span kind' }));
      fireEvent.click(kinds.getByText('Clear'));
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [] });
    });

    it('clears the hide clause when Only is clicked a second time', async () => {
      render(
        <Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={hideServices('svc-a')} treeMode="lift" />
      );
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      fireEvent.click(screen.getByRole('button', { name: 'Only svc-b' }));
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [] });
    });

    it('recognises an undone list edit as no change', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      (trace.spans[1] as { kind: SpanKind }).kind = SpanKind.CLIENT;
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'hide', criterion: { shape: 'set', property: 'kind', values: ['server'] } },
          { verb: 'keep', criterion: { shape: 'text', text: 'op-s' } },
        ],
      };
      renderButton(trace, filter, 0);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Client' }));
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Show Client' }));
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('recognises an undone edit that emptied a clause', async () => {
      const trace = makeTrace(['svc-a']);
      (trace.spans[0] as { kind: SpanKind }).kind = SpanKind.SERVER;
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'hide', criterion: { shape: 'set', property: 'kind', values: ['server'] } },
          { verb: 'keep', criterion: { shape: 'text', text: 'op-s' } },
        ],
      };
      renderButton(trace, filter, 0);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Show Server' }));
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Server' }));
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('keeps a chip in its place when its verb switches, even the hide clause on service', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
          { verb: 'keep', criterion: { shape: 'text', text: 'op-s' } },
        ],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getAllByRole('button', { name: 'keep, switch to hide' })[0]);
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [
          { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
          { verb: 'keep', criterion: { shape: 'text', text: 'op-s' } },
        ],
      });
    });

    it('replaces the keep range of the property when a hidden range switches to keep', async () => {
      const range = (verb: 'keep' | 'hide', min: number, max: number): IClause => ({
        verb,
        criterion: { shape: 'range', property: 'duration', min, max },
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [range('hide', 0, 3000), range('keep', 2000, Infinity)],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      expect(onChange).toHaveBeenCalledWith({ treeMode: 'lift', clauses: [range('keep', 0, 3000)] });
    });

    it('keeps the hide ranges of the property when a kept range switches to hide', async () => {
      const range = (verb: 'keep' | 'hide', min: number, max: number): IClause => ({
        verb,
        criterion: { shape: 'range', property: 'duration', min, max },
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [range('hide', 3000, 4000), range('keep', 0, 2000)],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'keep, switch to hide' }));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [range('hide', 0, 2000), range('hide', 3000, 4000)],
      });
    });

    it('clears a keep clause only when it names every service of the trace', async () => {
      // The clause names as many services as the trace has, but one of them is not in the trace.
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['absent', 'svc-a'] } },
        ],
      };
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), filter);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Show svc-b' }));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [
          {
            verb: 'keep',
            criterion: { shape: 'set', property: 'service', values: ['absent', 'svc-a', 'svc-b'] },
          },
        ],
      });
    });

    it('folds a section and opens it again', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      const toggle = screen.getByRole('button', { name: 'Service', expanded: true });
      fireEvent.click(toggle);
      expect(screen.queryByText('svc-a')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Service', expanded: false }));
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });
  });

  describe('status', () => {
    const hideErrors: ISpanFilter = { ...keepErrors, clauses: [{ ...keepErrors.clauses[0], verb: 'hide' }] };

    it('lists the statuses with their counts and keeps one with the eye', async () => {
      render(<Stateful trace={withErrorSpan(makeTrace(['svc-a', 'svc-b']))} treeMode="lift" />);
      await open();
      const rows = screen.getByRole('group', { name: 'Status values' });
      expect(rows).toHaveTextContent('No error4');
      expect(rows).toHaveTextContent('Error1');
      fireEvent.click(screen.getByRole('button', { name: 'Only Error' }));
      expect(onChange).toHaveBeenLastCalledWith(keepErrors);
      fireEvent.click(screen.getByRole('button', { name: 'Only No error' }));
      expect(onChange).toHaveBeenLastCalledWith({
        ...keepErrors,
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['ok'] } }],
      });
      fireEvent.click(screen.getByRole('button', { name: 'Only No error' }));
      expect(onChange).toHaveBeenLastCalledWith({ ...keepErrors, clauses: [] });
    });

    it('hides a status with the crossed-out eye in either mode', async () => {
      render(<Stateful trace={withErrorSpan(makeTrace(['svc-a', 'svc-b']))} filter={REMOVE_FILTER} />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Error' }));
      expect(onChange).toHaveBeenLastCalledWith({ ...hideErrors, treeMode: 'remove' });
      expect(screen.getByRole('button', { name: 'Remove status: Error' })).toBeInTheDocument();
    });

    it('disables the eye in remove mode', async () => {
      renderButton(withErrorSpan(makeTrace(['svc-a', 'svc-b'])), REMOVE_FILTER);
      await open();
      const only = screen.getByRole('button', { name: 'Only Error' });
      expect(only).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(only);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('replaces a hide clause on status when a status is kept', async () => {
      render(<Stateful trace={withErrorSpan(makeTrace(['svc-a', 'svc-b']))} filter={hideErrors} />);
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only Error' }));
      expect(onChange).toHaveBeenLastCalledWith(keepErrors);
    });

    it('is not drawn when every span has the same status', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      expect(screen.queryByText('Status')).toBeNull();
    });

    it('waits for Apply above the threshold', async () => {
      renderButton(
        withErrorSpan(makeTrace(['svc-a', 'svc-b'])),
        { ...EMPTY_SPAN_FILTER, treeMode: 'lift' },
        0
      );
      await open();
      fireEvent.click(screen.getByRole('button', { name: 'Only Error' }));
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledWith(keepErrors);
    });
  });

  describe('attribute contains', () => {
    it('adds a keep clause from the input on Enter and clears the input', async () => {
      render(
        <Stateful
          trace={withAttribute(makeTrace(['svc-a', 'svc-b']), 'http.method', 'GET')}
          treeMode="lift"
        />
      );
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: ' http.method:GET ' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'attr', text: 'http.method:GET' } }],
      });
      expect(input).toHaveValue('');
    });

    it('lists the clause after the hide clause on service, in the chip order', async () => {
      render(
        <Stateful
          trace={withAttribute(makeTrace(['svc-a', 'svc-b']), 'k', 'v', 2)}
          filter={hideServices('svc-b')}
          treeMode="lift"
        />
      );
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: 'k:v' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [
          ...hideServices('svc-b').clauses,
          { verb: 'keep', criterion: { shape: 'attr', text: 'k:v' } },
        ],
      });
    });

    it('waits for Apply above the threshold', async () => {
      renderButton(
        withAttribute(makeTrace(['svc-a', 'svc-b']), 'k', 'v'),
        { ...EMPTY_SPAN_FILTER, treeMode: 'lift' },
        0
      );
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: 'k:v' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'attr', text: 'k:v' } }],
      });
    });

    it('adds a hide clause from the crossed eye, in remove mode too', async () => {
      render(
        <Stateful trace={withAttribute(makeTrace(['svc-a', 'svc-b']), 'k', 'v')} filter={REMOVE_FILTER} />
      );
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: 'k:v' } });
      fireEvent.click(screen.getByRole('button', { name: 'Hide spans with it' }));
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'remove',
        clauses: [{ verb: 'hide', criterion: { shape: 'attr', text: 'k:v' } }],
      });
      expect(input).toHaveValue('');
    });

    it('disables the keep eye in remove mode, with the reason on keyboard focus', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), REMOVE_FILTER);
      await open();
      const keep = screen.getByRole('button', { name: 'Keep spans with it' });
      expect(keep).toHaveAttribute('aria-disabled', 'true');
      fireEvent.focus(keep);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(KEEP_NEEDS_LIFT));
    });

    it('ignores Enter and the keep eye in remove mode', async () => {
      // The root carries the attribute, so the keep clause would not be held for hiding the root.
      const trace = withAttribute(makeTrace(['svc-a', 'svc-b']), 'k', 'v', 0);
      render(<Stateful trace={trace} filter={REMOVE_FILTER} />);
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: 'k:v' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.click(screen.getByRole('button', { name: 'Keep spans with it' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('k:v');
    });

    it('ignores an empty input', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Attribute contains' }), {
        key: 'Enter',
        code: 'Enter',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Keep spans with it' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hide spans with it' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Keep spans with it' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.getByRole('button', { name: 'Hide spans with it' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    it('disables the eyes up front when the clause would leave no span shown', async () => {
      // Every span carries the attribute, so hiding it leaves nothing; nothing carries the other.
      const trace = [0, 1, 2, 3, 4].reduce(
        (t, i) => withAttribute(t, 'k', 'v', i),
        makeTrace(['svc-a', 'svc-b'])
      );
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const input = screen.getByRole('textbox', { name: 'Attribute contains' });
      fireEvent.change(input, { target: { value: 'k:v' } });
      const hide = screen.getByRole('button', { name: 'Hide spans with it' });
      expect(hide).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Keep spans with it' })).toHaveAttribute(
        'aria-disabled',
        'false'
      );
      fireEvent.focus(hide);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(LEAVES_NO_SPAN));
      fireEvent.click(hide);
      fireEvent.change(input, { target: { value: 'nothing:here' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      fireEvent.click(screen.getByRole('button', { name: 'Keep spans with it' }));
      // Nothing matches, so keeping would empty the tree and hiding would change nothing.
      const keep = screen.getByRole('button', { name: 'Keep spans with it' });
      expect(keep).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Hide spans with it' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      fireEvent.focus(keep);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(NO_SPAN_MATCHES));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('disables the hide eye in remove mode when every root span has the attribute', async () => {
      renderButton(withAttribute(makeTrace(['svc-a', 'svc-b']), 'k', 'v', 0), REMOVE_FILTER);
      await open();
      fireEvent.change(screen.getByRole('textbox', { name: 'Attribute contains' }), {
        target: { value: 'k:v' },
      });
      const hide = screen.getByRole('button', { name: 'Hide spans with it' });
      expect(hide).toHaveAttribute('aria-disabled', 'true');
      fireEvent.focus(hide);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(LEAVES_NO_SPAN));
    });

    it('explains the syntax behind the question mark', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      fireEvent.focus(screen.getByRole('button', { name: 'Attribute contains help' }));
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent('http.method:GET'));
    });
  });

  describe('duration', () => {
    it('keeps the range between the handles and drops the clause when both are at the ends', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      press(screen.getAllByRole('slider')[1], LEFT);
      const applied = onChange.mock.calls.at(-1)![0] as ISpanFilter;
      expect(applied.clauses).toHaveLength(1);
      const { criterion } = applied.clauses[0];
      expect(criterion.shape).toBe('range');
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.property).toBe('duration');
      expect(criterion.min).toBe(0);
      // One step below the end of an axis from 1000 µs to 5000 µs is 1000 µs × 5^0.99.
      expect(criterion.max).toBe(4920);
      press(screen.getAllByRole('slider')[1], RIGHT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses).toHaveLength(0);
    });

    it('is disabled in remove mode, with the reason on keyboard focus', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), REMOVE_FILTER);
      await open();
      screen.getAllByRole('slider').forEach(h => expect(h).toHaveAttribute('aria-disabled', 'true'));
      const group = screen.getByRole('group', { name: 'Span duration range' });
      expect(group).toHaveAttribute('tabindex', '0');
      fireEvent.focus(group);
      await waitFor(() => expect(visibleTooltip()).toHaveTextContent(KEEP_NEEDS_LIFT));
    });

    it('names the handles and announces their bounds as durations', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      const lower = screen.getByRole('slider', { name: 'Span duration lower bound' });
      expect(lower).toHaveAttribute('aria-valuetext', '1ms');
      expect(screen.getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '5ms'
      );
    });

    it('moves a handle by arrow keys without snapping back to the rounded bound', async () => {
      // Two durations one microsecond apart: one key step changes the position, not the rounded bound.
      const trace = makeTrace(['svc-a'], undefined, 2);
      (trace.spans[0] as { duration: number }).duration = 1;
      (trace.spans[1] as { duration: number }).duration = 2;
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      press(upper, LEFT);
      press(upper, LEFT);
      expect(upper).toHaveAttribute('aria-valuenow', '98');
    });

    it('keeps the bound of the handle that did not move', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1500, max: Infinity } },
        ],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      press(screen.getAllByRole('slider')[1], LEFT);
      const applied = onChange.mock.calls.at(-1)![0] as ISpanFilter;
      const { criterion } = applied.clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.min).toBe(1500);
      expect(criterion.max).toBeLessThan(5000);
    });

    it('keeps a bound that sits at the end of the axis when the other handle moves', async () => {
      // 1001 µs rounds to the first slider position on an axis from 1000 µs to 5000 µs.
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1001, max: Infinity } },
        ],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      expect(screen.getAllByRole('slider')[0]).toHaveAttribute('aria-valuenow', '0');
      press(screen.getAllByRole('slider')[1], LEFT);
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.min).toBe(1001);
    });

    it('stops a handle at the other bound instead of crossing it', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1500, max: Infinity } },
        ],
      };
      // One span sits at the met bound, so the range the handles meet at still keeps a span.
      const trace = makeTrace(['svc-a', 'svc-b']);
      (trace.spans[2] as { duration: number }).duration = 1500;
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      const lowerPosition = Number(lower.getAttribute('aria-valuenow'));
      fireEvent.keyDown(upper, { keyCode: 36 }); // Home moves the upper handle onto the lower one
      fireEvent.keyUp(upper, { keyCode: 36 });
      expect(upper).toHaveAttribute('aria-valuenow', String(lowerPosition));
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion).toMatchObject({ min: 1500, max: 1500 });
    });

    it('keeps the position of the handle that did not move when the other bound changes', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      [1, 2, 3].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      press(lower, RIGHT);
      press(lower, RIGHT);
      expect(lower).toHaveAttribute('aria-valuenow', '2');
      expect(onChange).not.toHaveBeenCalled();
      for (let i = 0; i < 17; i += 1) press(upper, LEFT);
      expect(onChange).toHaveBeenLastCalledWith({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: 2 } }],
      });
      // The upper handle moves to the position of its new bound; the lower one keeps its own.
      expect(lower).toHaveAttribute('aria-valuenow', '2');
      expect(upper).toHaveAttribute('aria-valuenow', '63');
    });

    it('shades every bin while a handle rests at a position whose bound excludes nothing', async () => {
      const trace = makeTrace(['svc-a'], undefined, 5);
      [1, 2, 3, 4, 20].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const lower = screen.getAllByRole('slider')[0];
      // Five steps still round to the smallest duration, so no clause is written.
      for (let i = 0; i < 5; i += 1) press(lower, RIGHT);
      expect(onChange).not.toHaveBeenCalled();
      expect(lower).toHaveAttribute('aria-valuenow', '5');
      const bins = document.querySelectorAll('.RangeFacet--bin');
      expect(bins.length).toBeGreaterThan(0);
      bins.forEach(bin => expect(bin).toHaveClass('is-in'));
    });

    it('shades a bin only while one of its values is kept', async () => {
      const trace = makeTrace(['svc-a'], undefined, 2);
      [1000, 1000000].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const lower = screen.getAllByRole('slider')[0];
      // Two steps up a 1000 µs to 1 s axis put the bound at 1148 µs, above the 1000 µs span, whose
      // bin still sits under the handle.
      press(lower, RIGHT);
      press(lower, RIGHT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 1148,
      });
      const bins = document.querySelectorAll('.RangeFacet--bin');
      expect(bins[0]).not.toHaveClass('is-in');
      expect(bins[bins.length - 1]).toHaveClass('is-in');
    });

    it('ends the axis at the largest value of the trace', async () => {
      // With the axis padded to twice the smallest value, no handle position between the two
      // durations would separate them.
      const trace = makeTrace(['svc-a'], undefined, 2);
      (trace.spans[0] as { duration: number }).duration = 1000;
      (trace.spans[1] as { duration: number }).duration = 1500;
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      press(screen.getAllByRole('slider')[1], LEFT);
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.max).toBeLessThan(1500);
    });

    it('waits for Apply above the threshold', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' }, 0);
      await open();
      press(screen.getAllByRole('slider')[1], LEFT);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as ISpanFilter).clauses[0].criterion.shape).toBe('range');
    });

    it('returns the handles to the ends when the range is cleared', async () => {
      // On an axis from 1 µs to 3 µs a bound of 2 µs sits at position 63, and one step to the right
      // still rounds to 2 µs, so the handle is displaced from the bound it draws.
      const trace = makeTrace(['svc-a'], undefined, 3);
      [1, 2, 3].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: 2 } }],
      };
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      expect(upper).toHaveAttribute('aria-valuenow', '63');
      press(upper, RIGHT);
      expect(upper).toHaveAttribute('aria-valuenow', '64');
      fireEvent.click(screen.getByText('Clear all'));
      await open();
      expect(screen.getAllByRole('slider')[1]).toHaveAttribute('aria-valuenow', '100');
    });

    it('drops the clause when a handle returns to the end it started from', async () => {
      // On an axis from 1 µs to 5000 µs the first position above zero rounds back to 1 µs.
      const trace = makeTrace(['svc-a'], undefined, 3);
      [0, 1000, 5000].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const lower = screen.getAllByRole('slider')[0];
      press(lower, RIGHT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses).toHaveLength(1);
      press(lower, LEFT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses).toHaveLength(0);
    });

    it('draws no range facet when no value exceeds the start of the axis', async () => {
      const trace = makeTrace(['svc-a'], undefined, 2);
      (trace.spans[0] as { duration: number }).duration = 0;
      (trace.spans[1] as { duration: number }).duration = 1;
      renderButton(trace, { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      expect(screen.queryByText('Span duration')).toBeNull();
    });

    it('keeps the upper bound when the lower handle moves, and stops the lower handle at the upper', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1500, max: 3000 } },
        ],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      press(lower, RIGHT);
      let { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      expect(criterion).toMatchObject({ max: 3000 });
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.min).toBeGreaterThan(1500);
      fireEvent.keyDown(lower, { keyCode: 35 }); // End moves the lower handle onto the upper one
      fireEvent.keyUp(lower, { keyCode: 35 });
      expect(lower).toHaveAttribute('aria-valuenow', upper.getAttribute('aria-valuenow')!);
      ({ criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0]);
      expect(criterion).toMatchObject({ min: 3000, max: 3000 });
    });

    it('keeps the value at the end of the axis when a handle meets the other one at an open bound', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      fireEvent.keyDown(lower, { keyCode: 35 }); // End
      fireEvent.keyUp(lower, { keyCode: 35 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 5000,
        max: Infinity,
      });
      fireEvent.keyDown(lower, { keyCode: 36 }); // Home: both handles at the ends again
      fireEvent.keyUp(lower, { keyCode: 36 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses).toHaveLength(0);
      fireEvent.keyDown(upper, { keyCode: 36 }); // Home
      fireEvent.keyUp(upper, { keyCode: 36 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 0,
        max: 1000,
      });
    });

    it('keeps every value drawn at the start of the axis when the handles meet there', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      [0, 1, 5000].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      fireEvent.keyDown(upper, { keyCode: 36 }); // Home
      fireEvent.keyUp(upper, { keyCode: 36 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 0,
        max: 1,
      });
    });

    it('moves only the handle of the gesture after the other one was snapped to its bound', async () => {
      // On an axis from 1 µs to 5000 µs the first positions round to 1 µs, so the lower handle is
      // displaced from its bound; the upper handle meets it and then moves away again.
      const trace = makeTrace(['svc-a'], undefined, 3);
      [0, 1000, 5000].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      press(lower, RIGHT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({ min: 1 });
      fireEvent.keyDown(upper, { keyCode: 36 }); // Home
      fireEvent.keyUp(upper, { keyCode: 36 });
      press(upper, RIGHT);
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({ min: 1 });
    });

    it('keeps a committed lower bound at the start of the axis when the upper handle meets it', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1001, max: Infinity } },
        ],
      };
      // One span sits at the met bound, so the range the handles meet at still keeps a span.
      const trace = makeTrace(['svc-a', 'svc-b']);
      (trace.spans[2] as { duration: number }).duration = 1001;
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      fireEvent.keyDown(upper, { keyCode: 36 }); // Home
      fireEvent.keyUp(upper, { keyCode: 36 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 1001,
        max: 1001,
      });
    });

    it('commits a gesture whose key is never released when the handle loses focus', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      fireEvent.keyDown(upper, { keyCode: LEFT });
      fireEvent.keyDown(upper, { keyCode: LEFT });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.blur(upper);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(upper).toHaveAttribute('aria-valuenow', '98');
      const { criterion } = (onChange.mock.calls[0][0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.min).toBe(0);
      expect(criterion.max).toBeLessThan(5000);
    });

    it('labels and announces a URL bound that excludes no span as the trace end', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1, max: 999_000_000 } },
        ],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      expect(screen.getByRole('slider', { name: 'Span duration lower bound' })).toHaveAttribute(
        'aria-valuetext',
        '1ms'
      );
      expect(screen.getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '5ms'
      );
      const bounds = screen
        .getByRole('region', { name: 'Span duration' })
        .querySelector('.RangeFacet--bounds');
      expect(bounds).toHaveTextContent('1ms5ms');
    });

    it('announces a committed bound and an open bound as the labels spell them', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      [0, 1000, 5000].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: 4000 } }],
      };
      renderButton(trace, filter);
      await open();
      expect(screen.getByRole('slider', { name: 'Span duration lower bound' })).toHaveAttribute(
        'aria-valuetext',
        '0μs'
      );
      expect(screen.getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '4ms'
      );
    });

    it('commits a track click, also after a handle has focus', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      const track = screen.getAllByRole('slider')[0].closest('.ant-slider') as HTMLElement;
      track.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 100,
          height: 10,
          right: 100,
          bottom: 10,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
      const click = (x: number) => {
        fireEvent.mouseDown(track, { clientX: x, clientY: 5, button: 0 });
        fireEvent.mouseUp(document, { clientX: x, clientY: 5, button: 0 });
      };
      click(80);
      expect(onChange).toHaveBeenCalledTimes(1);
      click(60);
      expect(onChange).toHaveBeenCalledTimes(2);
      const { criterion } = (onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0];
      if (criterion.shape !== 'range') throw new Error('unreachable');
      expect(criterion.max).toBeLessThan(3000);
    });

    it('does not commit a pointer gesture on the blur that starts it, after a key gesture', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} treeMode="lift" />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      press(upper, LEFT);
      expect(onChange).toHaveBeenCalledTimes(1);
      const track = upper.closest('.ant-slider') as HTMLElement;
      track.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 100,
          height: 10,
          right: 100,
          bottom: 10,
          x: 0,
          y: 0,
          toJSON() {},
        }) as DOMRect;
      fireEvent.pointerDown(track, { clientX: 60, clientY: 5, button: 0 });
      fireEvent.mouseDown(track, { clientX: 60, clientY: 5, button: 0 });
      fireEvent.blur(upper);
      expect(onChange).toHaveBeenCalledTimes(1);
      fireEvent.mouseUp(document, { clientX: 60, clientY: 5, button: 0 });
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('commits nothing for a key gesture that returns to where it began', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: 3000 } }],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      const upper = screen.getAllByRole('slider')[1];
      fireEvent.keyDown(upper, { keyCode: LEFT });
      fireEvent.keyDown(upper, { keyCode: RIGHT });
      fireEvent.keyUp(upper, { keyCode: RIGHT });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('labels a committed lower bound with its value', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 2000, max: Infinity } },
        ],
      };
      renderButton(makeTrace(['svc-a']), filter);
      await open();
      expect(screen.getByRole('slider', { name: 'Span duration lower bound' })).toHaveAttribute(
        'aria-valuetext',
        '2ms'
      );
      const bounds = screen
        .getByRole('region', { name: 'Span duration' })
        .querySelector('.RangeFacet--bounds');
      expect(bounds).toHaveTextContent('2ms5ms');
    });

    it('does not label a URL range outside the trace as an inverted range', async () => {
      const keep = (min: number, max: number): ISpanFilter => ({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min, max } }],
      });
      const bounds = () =>
        screen.getByRole('region', { name: 'Span duration' }).querySelector('.RangeFacet--bounds');
      const { unmount } = renderButton(makeTrace(['svc-a']), keep(2, 3));
      await open();
      expect(bounds()).toHaveTextContent('2μs3μs');
      unmount();
      renderButton(makeTrace(['svc-a']), keep(10_000_000, 20_000_000));
      await open();
      expect(bounds()).toHaveTextContent('10s20s');
      expect(screen.getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '20s'
      );
      cleanup();
      renderButton(makeTrace(['svc-a']), keep(10_000_000, Infinity));
      await open();
      expect(bounds()).toHaveTextContent('10s10s');
      expect(screen.getByRole('slider', { name: 'Span duration upper bound' })).toHaveAttribute(
        'aria-valuetext',
        '10s'
      );
    });

    it('keeps the handle in place when a key step clears a URL clause with both bounds open', async () => {
      const trace = makeTrace(['svc-a'], undefined, 5);
      [0, 1, 2, 2, 2].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: Infinity } },
        ],
      };
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      const upper = screen.getByRole('slider', { name: 'Span duration upper bound' });
      press(upper, LEFT);
      expect(onChange).toHaveBeenLastCalledWith({ treeMode: 'lift', clauses: [] });
      expect(upper).toHaveAttribute('aria-valuenow', '99');
    });

    it('treats a URL bound below the smallest value as open', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 500, max: 3000 } }],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      const [lower, upper] = screen.getAllByRole('slider');
      fireEvent.keyDown(lower, { keyCode: 36 }); // Home, where it already is
      fireEvent.keyUp(lower, { keyCode: 36 });
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.keyDown(upper, { keyCode: 35 }); // End
      fireEvent.keyUp(upper, { keyCode: 35 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses).toHaveLength(0);
    });

    it('returns a displaced lower handle to the start when the range is cleared', async () => {
      const trace = makeTrace(['svc-a'], undefined, 3);
      [1, 2, 3].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 0, max: 2 } }],
      };
      render(<Stateful trace={trace} filter={filter} />);
      await open();
      const lower = screen.getAllByRole('slider')[0];
      press(lower, RIGHT);
      press(lower, RIGHT);
      expect(lower).toHaveAttribute('aria-valuenow', '2');
      fireEvent.click(screen.getByText('Clear all'));
      await open();
      expect(screen.getAllByRole('slider')[0]).toHaveAttribute('aria-valuenow', '0');
    });

    it('treats a URL bound that excludes no span as open when the other handle meets it', async () => {
      const keep = (min: number, max: number): ISpanFilter => ({
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'range', property: 'duration', min, max } }],
      });
      const { unmount } = render(
        <Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={keep(500, Infinity)} />
      );
      await open();
      fireEvent.keyDown(screen.getAllByRole('slider')[1], { keyCode: 36 }); // Home
      fireEvent.keyUp(screen.getAllByRole('slider')[1], { keyCode: 36 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 0,
        max: 1000,
      });
      unmount();
      onChange.mockClear();
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={keep(2000, 9000)} />);
      await open();
      fireEvent.keyDown(screen.getAllByRole('slider')[0], { keyCode: 35 }); // End
      fireEvent.keyUp(screen.getAllByRole('slider')[0], { keyCode: 35 });
      expect((onChange.mock.calls.at(-1)![0] as ISpanFilter).clauses[0].criterion).toMatchObject({
        min: 5000,
        max: Infinity,
      });
    });

    it('commits nothing for a key that moves no handle', async () => {
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [
          { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1500, max: Infinity } },
        ],
      };
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'])} filter={filter} />);
      await open();
      fireEvent.keyDown(screen.getAllByRole('slider')[1], { keyCode: 35 }); // End, where it already is
      fireEvent.keyUp(screen.getAllByRole('slider')[1], { keyCode: 35 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('leaves a bound open when it would exclude no span', async () => {
      // On an axis from 3 µs to 40 µs the first positions round back to 3 µs, the smallest value.
      const trace = makeTrace(['svc-a'], undefined, 3);
      [3, 10, 40].forEach((d, i) => {
        (trace.spans[i] as { duration: number }).duration = d;
      });
      render(<Stateful trace={trace} treeMode="lift" />);
      await open();
      press(screen.getAllByRole('slider')[0], RIGHT);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('draws no range facet when every span has the same value', async () => {
      const trace = makeTrace(['svc-a', 'svc-b']);
      trace.spans.forEach(span => {
        (span as { duration: number }).duration = 1000;
      });
      renderButton(trace);
      await open();
      expect(screen.queryByText('Span duration')).toBeNull();
    });
  });
});
