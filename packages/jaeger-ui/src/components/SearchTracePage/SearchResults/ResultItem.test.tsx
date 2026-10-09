// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ResultItem from './ResultItem';
import * as markers from './ResultItem.markers';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { traceToTraceSummary } from '../../../model/trace-summary';
import * as tracking from './index.track';
import type { TraceSummary } from '../../../types/trace-summary';

// Helper function to wrap component with Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: MemoryRouter });
};

describe('<ResultItem />', () => {
  let traceSummary: TraceSummary;

  const getDefaultProps = (): React.ComponentProps<typeof ResultItem> => ({
    traceSummary,
    durationPercent: 50,
    linkTo: { pathname: '/' },
    toggleComparison: vi.fn(),
    isInDiffCohort: false,
    disableComparision: false,
  });

  const setup = (props?: Partial<React.ComponentProps<typeof ResultItem>>) => {
    return renderWithRouter(<ResultItem {...getDefaultProps()} {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset trace data before each test.
    // Some tests modify the trace object (e.g., adding tags).
    // Resetting ensures that each test starts with a clean, unmodified trace,
    // preventing side effects between tests and maintaining test isolation.
    const trace = transformTraceData(traceGenerator.trace({}));
    traceSummary = traceToTraceSummary(trace!.asOtelTrace());
  });

  it('should render base case correctly', () => {
    setup();
    expect(screen.getByTestId(markers.NUM_SPANS)).toHaveTextContent(`${traceSummary.spanCount} Spans`);
    const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
    const serviceTags = serviceTagsContainer.querySelectorAll('li > .ServicePills--tag');
    expect(serviceTags).toHaveLength(traceSummary.services.length);
  });

  it('should not render any ServiceTags when there are no services', () => {
    setup({ traceSummary: { ...traceSummary, services: [] } });
    const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
    const serviceTags = serviceTagsContainer.querySelectorAll('li > .ServicePills--tag');
    expect(serviceTags).toHaveLength(0);
  });

  it('should render error icon on ServiceTags that have an error span', () => {
    // Assume the summary has at least one service.
    expect(traceSummary.services.length).toBeGreaterThan(0);
    const targetService = traceSummary.services[0];

    // Mark the first service as having errors.
    const summaryWithError: TraceSummary = {
      ...traceSummary,
      errorSpanCount: 1,
      services: traceSummary.services.map((s, i) => (i === 0 ? { ...s, errorSpanCount: 1 } : s)),
    };

    setup({ traceSummary: summaryWithError });

    const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
    const errorTag = Array.from(serviceTagsContainer.querySelectorAll('li > .ServicePills--tag')).find(tag =>
      tag.textContent?.includes(targetService.name)
    );

    expect(errorTag).toBeDefined();
    expect(errorTag?.querySelector('.ServicePills--errorIcon')).toBeInTheDocument();
  });

  it('passes router state to destination route when linkTo is a TracePageLink', async () => {
    function Destination() {
      const location = useLocation();
      return <div data-testid="state">{JSON.stringify(location.state)}</div>;
    }

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <ResultItem
              {...getDefaultProps()}
              linkTo={{ pathname: '/trace/abc', state: { fromSearch: '/search?service=foo' } }}
            />
          ),
        },
        { path: '/trace/:id', element: <Destination /> },
      ],
      { initialEntries: ['/'] }
    );

    const user = userEvent.setup();
    render(<RouterProvider router={router} />);

    // ResultItem renders two Links (ResultItemTitle + the body row); click the first one
    await user.click(screen.getAllByRole('link')[0]);

    expect(screen.getByTestId('state')).toHaveTextContent(
      JSON.stringify({ fromSearch: '/search?service=foo' })
    );
  });

  it('renders Uploaded tag when isUploaded is true', () => {
    setup({ isUploaded: true });
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('does not render Uploaded tag when isUploaded is false', () => {
    setup({ isUploaded: false });
    expect(screen.queryByText('Uploaded')).not.toBeInTheDocument();
  });

  it('calls trackConversions on click', async () => {
    const spy = vi.spyOn(tracking, 'trackConversions');
    const user = userEvent.setup();
    setup();
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(spy).toHaveBeenCalledWith(tracking.EAltViewActions.Traces);
  });

  it('hides span tag when spanCount is undefined', () => {
    const summary: TraceSummary = {
      ...traceSummary,
      spanCount: undefined,
      errorSpanCount: undefined,
      orphanSpanCount: undefined,
    };
    setup({ traceSummary: summary });
    expect(screen.queryByTestId(markers.NUM_SPANS)).not.toBeInTheDocument();
  });
});
