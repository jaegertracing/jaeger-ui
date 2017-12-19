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

jest.mock('redux-form', () => {
  function reduxForm() {
    return component => component;
  }
  function formValueSelector() {
    return () => null;
  }
  const Field = () => <div />;
  return { Field, formValueSelector, reduxForm };
});

jest.mock('react-router-dom');
jest.mock('store');

/* eslint-disable import/first */
import React from 'react';
import { shallow, mount } from 'enzyme';
import store from 'store';

import SearchTracePage, { mapStateToProps } from './index';
import TraceResultsScatterPlot from './TraceResultsScatterPlot';
import TraceSearchForm from './TraceSearchForm';
import TraceSearchResult from './TraceSearchResult';
import traceGenerator from '../../demo/trace-generators';
import { MOST_RECENT } from '../../model/order-by';
import transformTraceData from '../../model/transform-trace-data';

describe('<SearchTracePage>', () => {
  let wrapper;
  let traceResults;
  let props;

  beforeEach(() => {
    traceResults = [{ traceID: 'a', spans: [], processes: {} }, { traceID: 'b', spans: [], processes: {} }];
    props = {
      traceResults,
      isHomepage: false,
      loadingServices: false,
      loadingTraces: false,
      maxTraceDuration: 100,
      numberOfTraceResults: traceResults.length,
      services: null,
      sortTracesBy: MOST_RECENT,
      urlQueryParams: { service: 'svc-a' },
      // actions
      fetchServiceOperations: jest.fn(),
      fetchServices: jest.fn(),
      searchTraces: jest.fn(),
    };
    wrapper = shallow(<SearchTracePage {...props} />);
  });

  it('searches for traces if `service` or `traceID` are in the query string', () => {
    wrapper = mount(<SearchTracePage {...props} />);
    expect(props.searchTraces.mock.calls.length).toBe(1);
  });

  it('loads the services and operations if a service is stored', () => {
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    wrapper = mount(<SearchTracePage {...props} />);
    expect(props.fetchServices.mock.calls.length).toBe(1);
    expect(props.fetchServiceOperations.mock.calls.length).toBe(1);
    store.get = oldFn;
  });

  describe('loading', () => {
    it('shows a loading indicator if loading services', () => {
      wrapper.setProps({ loadingServices: true });
      expect(wrapper.find('.js-test-search-loader').length).toBe(1);
    });

    it('shows a loading indicator if loading traces', () => {
      wrapper.setProps({ loadingTraces: true });
      expect(wrapper.find('.js-test-traces-loader').length).toBe(1);
    });
  });

  it('shows a search form when services are loaded', () => {
    const services = [{ name: 'svc-a', operations: ['op-a'] }];
    wrapper.setProps({ services });
    expect(wrapper.find(TraceSearchForm).length).toBe(1);
  });

  it('shows an error message if there is an error message', () => {
    wrapper.setProps({ errorMessage: 'big-error' });
    expect(wrapper.find('.js-test-error-message').length).toBe(1);
  });

  it('shows the logo prior to searching', () => {
    wrapper.setProps({ isHomepage: true, traceResults: [] });
    expect(wrapper.find('.js-test-logo').length).toBe(1);
  });

  it('shows the "no results" message when the search result is empty', () => {
    wrapper.setProps({ traceResults: [] });
    expect(wrapper.find('.js-test-no-results').length).toBe(1);
  });

  describe('search finished with results', () => {
    it('shows a scatter plot', () => {
      expect(wrapper.find(TraceResultsScatterPlot).length).toBe(1);
    });

    it('shows the results filter form', () => {
      expect(wrapper.find('TraceResultsFilterFormImpl').length).toBe(1);
    });

    it('shows a result entry for each trace', () => {
      expect(wrapper.find(TraceSearchResult).length).toBe(traceResults.length);
    });
  });
});

describe('mapStateToProps()', () => {
  it('converts state to the necessary props', () => {
    const trace = transformTraceData(traceGenerator.trace({}));
    const stateTrace = { traces: [trace], loading: false, error: null };
    const stateServices = {
      loading: false,
      services: ['svc-a'],
      operationsForService: {},
      error: null,
    };
    const state = {
      router: { location: { search: '' } },
      trace: stateTrace,
      services: stateServices,
    };

    const { maxTraceDuration, traceResults, numberOfTraceResults, ...rest } = mapStateToProps(state);
    expect(traceResults.length).toBe(stateTrace.traces.length);
    expect(traceResults[0].traceID).toBe(trace.traceID);
    expect(maxTraceDuration).toBe(trace.duration / 1000);

    expect(rest).toEqual({
      isHomepage: true,
      // the redux-form `formValueSelector` mock returns `null` for "sortBy"
      sortTracesBy: null,
      urlQueryParams: {},
      services: [
        {
          name: stateServices.services[0],
          operations: [],
        },
      ],
      loadingTraces: false,
      loadingServices: false,
      errorMessage: '',
    });
  });
});
