// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import ResultItem from './ResultItem';
import * as markers from './ResultItem.markers';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { traceToTraceSummary } from '../../../model/trace-summary';
import * as tracking from './index.track';

// Helper function to wrap component with Router
const renderWithRouter = ui => {
  return render(ui, { wrapper: MemoryRouter });
};

let traceSummary;

beforeEach(() => {
  // Reset trace data before each test.
  // Some tests modify the trace object (e.g., adding tags).
  // Resetting ensures that each test starts with a clean, unmodified trace,
  // preventing side effects between tests and maintaining test isolation.
  const trace = transformTraceData(traceGenerator.trace({}));
  traceSummary = traceToTraceSummary(trace.asOtelTrace());
});

it('<ResultItem /> should render base case correctly', () => {
  renderWithRouter(
    <ResultItem
      traceSummary={traceSummary}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  expect(screen.getByTestId(markers.NUM_SPANS)).toHaveTextContent(`${traceSummary.spanCount} Spans`);
  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  const serviceTags = serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag');
  expect(serviceTags).toHaveLength(traceSummary.services.length);
});

it('<ResultItem /> should not render any ServiceTags when there are no services', () => {
  renderWithRouter(
    <ResultItem
      traceSummary={{ ...traceSummary, services: [] }}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  const serviceTags = serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag');
  expect(serviceTags).toHaveLength(0);
});

it('<ResultItem /> should render error icon on ServiceTags that have an error span', () => {
  // Assume the summary has at least one service.
  expect(traceSummary.services.length).toBeGreaterThan(0);
  const targetService = traceSummary.services[0];

  // Mark the first service as having errors.
  const summaryWithError = {
    ...traceSummary,
    errorSpanCount: 1,
    services: traceSummary.services.map((s, i) => (i === 0 ? { ...s, errorSpanCount: 1 } : s)),
  };

  renderWithRouter(
    <ResultItem
      traceSummary={summaryWithError}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );

  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  const errorTag = Array.from(serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag')).find(
    tag => tag.textContent.includes(targetService.name)
  );

  expect(errorTag).toBeDefined();
  expect(errorTag.querySelector('.ResultItem--errorIcon')).toBeInTheDocument();
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
            traceSummary={traceSummary}
            durationPercent={50}
            linkTo={{ pathname: '/trace/abc', state: { fromSearch: '/search?service=foo' } }}
            toggleComparison={() => {}}
            isInDiffCohort={false}
            disableComparision={false}
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
  renderWithRouter(
    <ResultItem
      traceSummary={traceSummary}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
      isUploaded
    />
  );
  expect(screen.getByText('Uploaded')).toBeInTheDocument();
});

it('does not render Uploaded tag when isUploaded is false', () => {
  renderWithRouter(
    <ResultItem
      traceSummary={traceSummary}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
      isUploaded={false}
    />
  );
  expect(screen.queryByText('Uploaded')).not.toBeInTheDocument();
});

it('calls trackConversions on click', () => {
  const spy = jest.spyOn(tracking, 'trackConversions');
  renderWithRouter(
    <ResultItem
      traceSummary={traceSummary}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  const buttons = screen.getAllByRole('button');
  buttons[0].click();
  expect(spy).toHaveBeenCalledWith(tracking.EAltViewActions.Traces);
});
