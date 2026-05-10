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
import * as tracking from './index.track';

// Helper function to wrap component with Router
const renderWithRouter = ui => {
  return render(ui, { wrapper: MemoryRouter });
};

let otelTrace; // OTEL facade of trace

beforeEach(() => {
  // Reset trace data before each test.
  // Some tests modify the trace object (e.g., adding tags).
  // Resetting ensures that each test starts with a clean, unmodified trace,
  // preventing side effects between tests and maintaining test isolation.
  const trace = transformTraceData(traceGenerator.trace({}));
  otelTrace = trace.asOtelTrace();
});

it('<ResultItem /> should render base case correctly', () => {
  renderWithRouter(
    <ResultItem
      trace={otelTrace}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  expect(screen.getByTestId(markers.NUM_SPANS)).toHaveTextContent(`${otelTrace.spans.length} Spans`);
  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  const serviceTags = serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag');
  expect(serviceTags).toHaveLength(otelTrace.services.length);
});

it('<ResultItem /> should not render any ServiceTags when there are no services', () => {
  // Create a proper OTEL trace with empty services but valid spans
  const otelTraceWithoutServices = {
    ...otelTrace,
    services: [],
    spans: otelTrace.spans, // Keep spans array
  };
  renderWithRouter(
    <ResultItem
      trace={otelTraceWithoutServices}
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

it('<ResultItem /> should render error icon on ServiceTags that have an error tag', () => {
  // Create a new trace for this test that we can modify
  const trace = transformTraceData(traceGenerator.trace({}));

  // Assume trace has services and spans from the generator. Assert this assumption.
  expect(trace.services).toBeDefined();
  expect(trace.services.length).toBeGreaterThan(0);
  expect(trace.spans).toBeDefined();
  expect(trace.spans.length).toBeGreaterThan(0);

  // Find the first span belonging to the first service.
  const firstService = trace.services[0];
  const spanWithError = trace.spans.find(span => span.process.serviceName === firstService.name);

  // Assert that a span for the first service was found. If not, the fixture is wrong.
  expect(spanWithError).toBeDefined();

  // Add the error tag directly, initializing tags array if necessary.
  spanWithError.tags = spanWithError.tags || [];
  spanWithError.tags.push({ key: 'error', value: true });

  // Clear cached OTEL facade and regenerate with the updated error tag
  trace._otelFacade = undefined;
  const updatedOtelTrace = trace.asOtelTrace();

  renderWithRouter(
    <ResultItem
      trace={updatedOtelTrace}
      durationPercent={50}
      linkTo={{ pathname: '/' }}
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );

  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  // Find the tag associated with the service that should have the error
  const errorTag = Array.from(serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag')).find(
    tag => tag.textContent.includes(firstService.name)
  );

  // Assert that the specific service tag is found and has the error icon
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
            trace={otelTrace}
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

it('calls trackConversions on click', () => {
  const spy = jest.spyOn(tracking, 'trackConversions');
  renderWithRouter(
    <ResultItem
      trace={otelTrace}
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
