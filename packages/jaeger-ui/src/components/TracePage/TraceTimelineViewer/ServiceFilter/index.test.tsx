// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SpanFilterButton from './index';
import { makeAttributes } from '../../../../model/attributes';
import { IOtelTrace, IOtelSpan, SpanKind, StatusCode } from '../../../../types/otel';
import { Microseconds } from '../../../../types/units';
import { EMPTY_SPAN_FILTER, IClause, ISpanFilter, withHiddenServices } from '../../spanFilter';

function makeSpan(spanID: string, serviceName: string, overrides: Partial<IOtelSpan> = {}): IOtelSpan {
  return {
    spanID,
    name: `op-${spanID}`,
    kind: SpanKind.INTERNAL,
    status: { code: StatusCode.UNSET },
    duration: 1000,
    attributes: makeAttributes([]),
    resource: { serviceName, attributes: makeAttributes([]) },
    ...overrides,
  } as unknown as IOtelSpan;
}

// The spans are dealt round-robin to the services, with durations that grow by one millisecond.
// The first spans are the roots, one per root service, and the rest are their children dealt
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
  return { services, rootSpans, spans } as unknown as IOtelTrace;
}

// A trace whose second span has an error status, so that a status clause has something to keep.
function withErrorSpan(trace: IOtelTrace): IOtelTrace {
  (trace.spans[1] as { status: { code: StatusCode } }).status = { code: StatusCode.ERROR };
  return trace;
}

const hideServices = (...names: string[]) => withHiddenServices(EMPTY_SPAN_FILTER, new Set(names));
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
  }: {
    trace: IOtelTrace;
    applyThreshold?: number;
    filter?: ISpanFilter;
  }) {
    const [filter, setFilter] = React.useState(initial);
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
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('omits the service list for a single-service trace', async () => {
    renderButton(makeTrace(['only-svc']));
    await open();
    expect(screen.queryByRole('checkbox')).toBeNull();
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
    it('applies a checkbox toggle as it is made and renders no Apply button', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']));
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b'));
      expect(screen.queryByText('Apply')).toBeNull();
    });

    it('applies Select None without the locked root service', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']));
      await open();
      fireEvent.click(screen.getByText('Select None'));
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b', 'svc-c'));
    });

    it('holds an edit that would hide every service and shows the warning instead of applying it', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b']));
      await open();
      fireEvent.click(screen.getByText('Select None'));
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('At least one service must be visible');
      expect(screen.getByText('Save as Default').closest('button')).toBeDisabled();
    });

    it('holds an edit that would hide every root service in remove mode', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])} />);
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenLastCalledWith(hideServices('svc-a'));
      fireEvent.click(checkboxes[1]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('This filter would leave no span shown');
      // Re-checking svc-b brings the selection back to the applied filter, so there is nothing to apply.
      fireEvent.click(checkboxes[1]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('deferred apply above the threshold', () => {
    it('applies at once at the threshold and waits one span above it', async () => {
      const { unmount } = renderButton(makeTrace(['svc-a', 'svc-b'], undefined, 5), EMPTY_SPAN_FILTER, 5);
      await open();
      expect(screen.queryByText('Apply')).toBeNull();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
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
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
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
      expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
    });

    it('accumulates checkbox toggles until Apply', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenCalledWith(hideServices('svc-b', 'svc-c'));
    });

    it('has nothing to apply after a service is toggled off and back on', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('disables Apply until something changed and while the draft is invalid', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b']), EMPTY_SPAN_FILTER, 0);
      await open();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      fireEvent.click(screen.getByText('Select None'));
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(screen.getByText('Apply').closest('button')).not.toBeDisabled();
    });

    it('removes a chip at once and applies the waiting list edits with it', async () => {
      const filter = withHiddenServices(keepErrors, new Set(['svc-c']));
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), filter, 0);
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove status: error' }));
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ ...keepErrors, clauses: [] }, new Set(['svc-b', 'svc-c']))
      );
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });
  });

  it('applies with the saveAsDefault option when Save as Default is clicked', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), EMPTY_SPAN_FILTER, 0);
    await open();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
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

  it('keeps the warning and the footer outside the scrolling sections', async () => {
    renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b']));
    await open();
    fireEvent.click(screen.getByText('Select None'));
    const alert = screen.getByRole('alert');
    expect(alert.closest('.SpanFilter--body')).toBeNull();
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

    it('switches the verb of a chip that exists only in the draft and applies the draft with it', async () => {
      const lift: ISpanFilter = { ...EMPTY_SPAN_FILTER, treeMode: 'lift' };
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), lift, 0);
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
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
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenLastCalledWith(hideServices('svc-b'));
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[2]);
      fireEvent.click(screen.getByRole('button', { name: /^Remove service/ }));
      expect(onChange).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
      expect(screen.queryByRole('button', { name: /^Remove service/ })).toBeNull();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('switches the verb of the service chip with the services a list edit added to it', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} applyThreshold={0} />);
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      fireEvent.click(screen.getByText('Apply'));
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      fireEvent.click(screen.getAllByRole('checkbox')[2]);
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

    it('merges a second keep chip on service into the first', async () => {
      const keep = (...values: string[]): IClause => ({
        verb: 'keep',
        criterion: { shape: 'set', property: 'service', values },
      });
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])} />);
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
      fireEvent.click(screen.getAllByRole('checkbox')[2]);
      fireEvent.click(screen.getByRole('button', { name: 'hide, switch to keep' }));
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
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
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
      fireEvent.click(screen.getByText('Select None'));
      // The service chip that Select None added comes first; the status chip follows it.
      fireEvent.click(screen.getAllByRole('button', { name: 'hide, switch to keep' })[1]);
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove status: error' }));
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-b']))
      );
    });

    it('applies the whole draft when a chip edit is valid only together with it', async () => {
      const filter = withHiddenServices({ treeMode: 'lift', clauses: [] }, new Set(['svc-a']));
      renderButton(makeTrace(['svc-a', 'svc-b'], ['svc-a']), filter, 0);
      await open();
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).toHaveBeenCalledWith(EMPTY_SPAN_FILTER);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('hides the shown count while a draft waits for Apply', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a'], 5), keepErrors, 0);
      await open();
      expect(screen.getByText(/of 5 spans shown/)).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
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
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      expect(screen.getByText('Apply').closest('button')).toBeEnabled();
      fireEvent.click(screen.getByTestId('span-filter-button'));
      await open();
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
      expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
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
      expect(screen.getByText('status: error')).toBeInTheDocument();
      expect(screen.getByText('service: svc-b')).toBeInTheDocument();
      expect(screen.getByText('2 of 5 spans shown')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Clear all'));
      expect(onChange).toHaveBeenCalledWith({ ...keepErrors, clauses: [] });
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
      renderButton(makeTrace(['svc-a', 'svc-b']), hideErrors);
      await open();
      const verb = screen.getByRole('button', { name: 'hide, cannot switch' });
      expect(verb).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(verb);
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.focus(verb);
      // The popover container is a tooltip too, so the reason is looked up by its text.
      await waitFor(() => expect(screen.getByText(/^Keep filters need/)).toBeInTheDocument());
    });
  });

  describe('draft and committed filter', () => {
    it('applies a held draft as a whole when a chip edit makes it valid below the threshold', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])} />);
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenLastCalledWith(hideServices('svc-a'));
      fireEvent.click(checkboxes[1]);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      expect(onChange).toHaveBeenLastCalledWith({ ...hideServices('svc-a', 'svc-b'), treeMode: 'lift' });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText('Apply')).toBeNull();
    });

    it('lets a draft show the sole root service again after a switch to remove mode', async () => {
      render(<Stateful trace={makeTrace(['svc-a', 'svc-b'], ['svc-a'])} applyThreshold={0} />);
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      fireEvent.click(screen.getByLabelText('Remove with it'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('leave no span');
      const root = screen.getAllByRole('checkbox')[0];
      expect(root).not.toBeDisabled();
      fireEvent.click(root);
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.click(screen.getByText('Apply'));
      expect(onChange).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
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

    it('applies nothing for a list edit that changes nothing', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']));
      await open();
      fireEvent.click(screen.getByText('Select All'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('leaves Apply disabled after a list edit that changes nothing above the threshold', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(screen.getByText('Select All'));
      expect(screen.getByText('Apply').closest('button')).toBeDisabled();
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
      const filter: ISpanFilter = {
        treeMode: 'lift',
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      };
      renderButton(makeTrace(['svc-a', 'svc-b']), filter);
      await open();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Hide svc-b' }));
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
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      expect(onChange).toHaveBeenCalledWith({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
    });

    it('switches the mode at once above the threshold too', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b']), EMPTY_SPAN_FILTER, 0);
      await open();
      fireEvent.click(screen.getByLabelText('Lift to its parent'));
      expect(onChange).toHaveBeenCalledWith({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
    });
  });

  describe('single root service locking', () => {
    it('disables the checkbox for the sole root service', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']));
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeDisabled();
      expect(checkboxes[1]).not.toBeDisabled();
      expect(checkboxes[2]).not.toBeDisabled();
    });

    it('leaves the sole root service selectable in lift mode', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c']), { ...EMPTY_SPAN_FILTER, treeMode: 'lift' });
      await open();
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeDisabled();
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalledWith(
        withHiddenServices({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' }, new Set(['svc-a']))
      );
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('does not lock root services when multiple root service names exist', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b']));
      await open();
      screen.getAllByRole('checkbox').forEach(cb => expect(cb).not.toBeDisabled());
    });

    it('shows root badge on all root services when multiple exist', async () => {
      renderButton(makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b']));
      await open();
      expect(screen.getAllByText('root')).toHaveLength(2);
    });
  });
});
