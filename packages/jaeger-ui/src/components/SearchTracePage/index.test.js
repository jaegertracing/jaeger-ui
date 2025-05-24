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

import { BrowserRouter, MemoryRouter } from 'react-router-dom';

jest.mock('store');

/* eslint-disable import/first */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import store from 'store';

import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage, mapStateToProps } from './index';
import SearchForm from './SearchForm';
import LoadingIndicator from '../common/LoadingIndicator';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import { MOST_RECENT, MOST_SPANS } from '../../model/order-by';
import transformTraceData from '../../model/transform-trace-data';
import { store as globalStore } from '../../utils/configure-store';

const AllProvider = ({ children }) => (
  <BrowserRouter>
    <Provider store={globalStore} data-testid="provider">
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  </BrowserRouter>
);

describe('<SearchTracePage>', () => {
  const queryOfResults = {};
  let rendered;
  beforeEach(() => {
    rendered = render(<SearchTracePage {...props} / data-testid="searchtracepage">, { wrappingComponent: AllProvider }));
  });

  it('searches for traces if `service` or `traceID` are in the query string', () => {
    expect(props.searchTraces.mock.calls.length).toBe(1);
  });

  it('loads the services and operations if a service is stored', () => {
    props.fetchServices.mockClear();
    props.fetchServiceOperations.mockClear();
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    wrapper = mount(
      <MemoryRouter>
        <SearchTracePage {...{ ...props, urlQueryParams: {} }} / data-testid="searchtracepage">
      </MemoryRouter>
    );
    expect(props.fetchServices.mock.calls.length).toBe(1);
    expect(props.fetchServiceOperations.mock.calls.length).toBe(1);
    expect(props.fetchServiceOperations.mock.calls[0][0]).toBe('svc-b');
    store.get = oldFn;
  });

  it('loads the operations linked to the URL service parameter if present', () => {
    props.fetchServices.mockClear();
    props.fetchServiceOperations.mockClear();
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    wrapper = mount(
      <MemoryRouter>
        <SearchTracePage {...props} / data-testid="searchtracepage">
      </MemoryRouter>
    );
    expect(props.fetchServices.mock.calls.length).toBe(1);
    expect(props.fetchServiceOperations.mock.calls.length).toBe(1);
    expect(props.fetchServiceOperations.mock.calls[0][0]).toBe('svc-a');
    store.get = oldFn;
  });

  it('calls sortedTracesXformer with correct arguments', () => {
    const sortBy = MOST_RECENT;
    wrapper.setState({ sortBy });
    expect(props.sortedTracesXformer).toHaveBeenCalledWith(traces, sortBy);
  });

  it('handles sort change correctly', () => {
    const sortBy = MOST_SPANS;
    // RTL doesn't access component instances - use assertions on rendered output instead.handleSortChange(sortBy);
    expect(wrapper.state('sortBy')).toBe(sortBy);
  });

  it('goToTrace pushes the trace URL with {fromSearch: true} to history', () => {
    const traceID = '15810714d6a27450';
    const query = 'some-query';
    const historyPush = jest.fn();
    const historyMock = { push: historyPush };
    wrapper = mount(
      <MemoryRouter>
        <SearchTracePage {...props} history={historyMock} query={query} / data-testid="searchtracepage">
      </MemoryRouter>
    );
    wrapper.find(SearchTracePage).first().instance().goToTrace(traceID);
    expect(historyPush.mock.calls.length).toBe(1);
    expect(historyPush.mock.calls[0][0]).toEqual({
      pathname: `/trace/${traceID}`,
      search: undefined,
      state: { fromSearch: '/search?' },
    });
  });

  it('shows a loading indicator if loading services', () => {
    rendered = render({ loadingServices: true });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(1);
  });

  it('shows a search form when services are loaded', () => {
    const services = [{ name: 'svc-a', operations: ['op-a'] }];
    rendered = render({ services });
    expect(screen.getAllByTestId(SearchForm)).toHaveLength(1);
  });

  it('shows an error message if there is an error message', () => {
    wrapper.setProps({ errors: [{ message: 'big-error' }] });
    expect(screen.getAllByTestId('.js-test-error-message')).toHaveLength(1);
  });

  it('shows the logo prior to searching', () => {
    rendered = render({ isHomepage: true, traceResults: [] });
    expect(screen.getAllByTestId('.js-test-logo')).toHaveLength(1);
  });

  it('hides SearchForm if is embed', () => {
    rendered = render({ embed: true });
    expect(screen.getAllByTestId(SearchForm)).toHaveLength(0);
  });

  it('hides logo if is embed', () => {
    rendered = render({ embed: true });
    expect(screen.getAllByTestId('.js-test-logo')).toHaveLength(0);
  });

  it('shows Upload tab by default', () => {
    expect(screen.getAllByTestId({ 'data-node-key': 'fileLoader' })).toHaveLength(1);
  });

  it('hides Upload tab if it is disabled via config', () => {
    rendered = render({ disableFileUploadControl: true });
    expect(screen.getAllByTestId({ 'data-node-key': 'fileLoader' })).toHaveLength(0);
  });
});

describe('mapStateToProps()', () => {
  it('converts state to the necessary props', () => {
    const trace = transformTraceData(traceGenerator.trace({}));
    const stateTrace = {
      search: {
        results: [trace.traceID],
        state: fetchedState.DONE,
      },
      traces: {
        [trace.traceID]: { id: trace.traceID, data: trace, state: fetchedState.DONE },
      },
      rawTraces: [trace],
    };
    const stateServices = {
      loading: false,
      services: ['svc-a'],
      operationsForService: {},
      error: null,
    };
    const state = {
      router: { location: { search: '' } },
      trace: stateTrace,
      traceDiff: {
        cohort: [trace.traceID],
      },
      services: stateServices,
      config: {
        disableFileUploadControl: false,
      },
    };

    const { maxTraceDuration, traceResultsToDownload, diffCohort, traces, ...rest } = mapStateToProps(state);
    expect(traces).toHaveLength(stateTrace.search.results.length);
    expect(traces[0].traceID).toBe(trace.traceID);
    expect(traceResultsToDownload[0].traceID).toBe(trace.traceID);
    expect(maxTraceDuration).toBe(trace.duration);
    expect(diffCohort).toHaveLength(state.traceDiff.cohort.length);
    expect(diffCohort[0].id).toBe(trace.traceID);
    expect(diffCohort[0].data.traceID).toBe(trace.traceID);

    expect(rest).toEqual({
      disableFileUploadControl: false,
      embedded: undefined,
      queryOfResults: undefined,
      isHomepage: true,
      sortedTracesXformer: expect.any(Function),
      urlQueryParams: null,
      services: [
        {
          name: stateServices.services[0],
          operations: [],
        },
      ],
      loadingTraces: false,
      loadingServices: false,
      errors: null,
    });
  });
});
