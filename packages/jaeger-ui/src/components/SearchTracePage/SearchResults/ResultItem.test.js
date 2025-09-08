// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import ResultItem from './ResultItem';
import * as markers from './ResultItem.markers';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import * as tracking from './index.track';

// Helper function to wrap component with Router
const renderWithRouter = ui => {
  return render(ui, { wrapper: MemoryRouter });
};

let trace; // Use let to allow modification in tests

beforeEach(() => {
  // Reset trace data before each test.
  // Some tests modify the trace object (e.g., adding tags).
  // Resetting ensures that each test starts with a clean, unmodified trace,
  // preventing side effects between tests and maintaining test isolation.
  trace = transformTraceData(traceGenerator.trace({}));
});

it('<ResultItem /> should render base case correctly', () => {
  renderWithRouter(
    <ResultItem
      trace={trace}
      durationPercent={50}
      linkTo=""
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  expect(screen.getByTestId(markers.NUM_SPANS)).toHaveTextContent(`${trace.spans.length} Spans`);
  const serviceTagsContainer = screen.getByTestId(markers.SERVICE_TAGS);
  const serviceTags = serviceTagsContainer.querySelectorAll('li > .ResultItem--serviceTag');
  expect(serviceTags).toHaveLength(trace.services.length);
});

it('<ResultItem /> should not render any ServiceTags when there are no services', () => {
  const traceWithoutServices = { ...trace, services: [] };
  renderWithRouter(
    <ResultItem
      trace={traceWithoutServices}
      durationPercent={50}
      linkTo=""
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

  renderWithRouter(
    <ResultItem
      trace={trace}
      durationPercent={50}
      linkTo=""
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

it('calls trackConversions on click', () => {
  const spy = jest.spyOn(tracking, 'trackConversions');
  renderWithRouter(
    <ResultItem
      trace={trace}
      durationPercent={50}
      linkTo=""
      toggleComparison={() => {}}
      isInDiffCohort={false}
      disableComparision={false}
    />
  );
  const buttons = screen.getAllByRole('button');
  buttons[0].click();
  expect(spy).toHaveBeenCalledWith(tracking.EAltViewActions.Traces);
});
