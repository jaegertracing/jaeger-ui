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

import React, { Component } from 'react';
import _values from 'lodash/values';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { Field, reduxForm, formValueSelector } from 'redux-form';
import store from 'store';

import JaegerLogo from '../../img/jaeger-logo.svg';

import * as jaegerApiActions from '../../actions/jaeger-api';
import TraceSearchForm from './TraceSearchForm';
import TraceSearchResult from './TraceSearchResult';
import TraceResultsScatterPlot from './TraceResultsScatterPlot';
import * as orderBy from '../../model/order-by';
import { sortTraces, getTraceSummaries } from '../../model/search';
import { getPercentageOfDuration } from '../../utils/date';
import getLastXformCacher from '../../utils/get-last-xform-cacher';
import prefixUrl from '../../utils/prefix-url';

/**
 * Contains the dropdown to sort and filter trace search results
 */
let TraceResultsFilterForm = () => (
  <div className="ui form">
    <div className="field inline">
      <label htmlFor="traceResultsSortBy">Sort</label>
      <Field name="sortBy" id="traceResultsSortBy" className="ui dropdown" component="select">
        <option value={orderBy.MOST_RECENT}>Most Recent</option>
        <option value={orderBy.LONGEST_FIRST}>Longest First</option>
        <option value={orderBy.SHORTEST_FIRST}>Shortest First</option>
        <option value={orderBy.MOST_SPANS}>Most Spans</option>
        <option value={orderBy.LEAST_SPANS}>Least Spans</option>
      </Field>
    </div>
  </div>
);

TraceResultsFilterForm = reduxForm({
  form: 'traceResultsFilters',
  initialValues: {
    sortBy: orderBy.MOST_RECENT,
  },
})(TraceResultsFilterForm);

const traceResultsFiltersFormSelector = formValueSelector('traceResultsFilters');

export default class SearchTracePage extends Component {
  componentDidMount() {
    const { searchTraces, urlQueryParams, fetchServices, fetchServiceOperations } = this.props;
    if (urlQueryParams.service || urlQueryParams.traceID) {
      searchTraces(urlQueryParams);
    }
    fetchServices();
    const { service } = store.get('lastSearch') || {};
    if (service && service !== '-') {
      fetchServiceOperations(service);
    }
  }

  render() {
    const {
      errorMessage,
      isHomepage,
      loadingServices,
      loadingTraces,
      maxTraceDuration,
      numberOfTraceResults,
      services,
      traceResults,
    } = this.props;
    const hasTraceResults = traceResults && traceResults.length > 0;
    return (
      <div className="trace-search ui grid padded">
        <div className="four wide column">
          <div className="ui tertiary segment" style={{ background: 'whitesmoke' }}>
            <h3>Find Traces</h3>
            {!loadingServices && services ? (
              <TraceSearchForm services={services} />
            ) : (
              <div className="m1">
                <div className="ui active centered inline loader" />
              </div>
            )}
          </div>
        </div>
        <div className="twelve wide column padded">
          {loadingTraces && <div className="ui active centered inline loader" />}
          {errorMessage &&
            !loadingTraces && (
              <div className="ui message red trace-search--error">
                There was an error querying for traces:<br />
                {errorMessage}
              </div>
            )}
          {isHomepage &&
            !hasTraceResults && (
              <div className="ui middle aligned center aligned grid" style={{ marginTop: 100 }}>
                <div className="column">
                  <img alt="presentation" src={JaegerLogo} width="400" />
                </div>
              </div>
            )}
          {!isHomepage &&
            !hasTraceResults &&
            !loadingTraces &&
            !errorMessage && (
              <div className="ui message trace-search--no-results">No trace results. Try another query.</div>
            )}
          {hasTraceResults &&
            !loadingTraces && (
              <div>
                <div>
                  <div style={{ border: '1px solid #e6e6e6' }}>
                    <div className="p2">
                      <TraceResultsScatterPlot
                        data={traceResults.map(t => ({
                          x: t.timestamp,
                          y: t.duration,
                          traceID: t.traceID,
                          size: t.numberOfSpans,
                          name: t.traceName,
                        }))}
                        onValueClick={t => {
                          this.props.history.push(`/trace/${t.traceID}`);
                        }}
                      />
                    </div>
                    <div className="p2 clearfix" style={{ backgroundColor: 'whitesmoke' }}>
                      <div className="left">
                        <span>
                          {numberOfTraceResults} Trace
                          {numberOfTraceResults > 1 && 's'}
                        </span>
                      </div>
                      <div className="right">
                        <TraceResultsFilterForm />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <ul className="list-reset">
                    {traceResults.map(trace => (
                      <li key={trace.traceID} className="my1">
                        <Link to={prefixUrl(`/trace/${trace.traceID}`)}>
                          <TraceSearchResult
                            trace={trace}
                            durationPercent={getPercentageOfDuration(trace.duration, maxTraceDuration)}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }
}

SearchTracePage.propTypes = {
  isHomepage: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  traceResults: PropTypes.array,
  numberOfTraceResults: PropTypes.number,
  maxTraceDuration: PropTypes.number,
  loadingServices: PropTypes.bool,
  loadingTraces: PropTypes.bool,
  urlQueryParams: PropTypes.shape({
    service: PropTypes.string,
    limit: PropTypes.string,
  }),
  services: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      operations: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  searchTraces: PropTypes.func,
  history: PropTypes.shape({
    push: PropTypes.func,
  }),
  fetchServiceOperations: PropTypes.func,
  fetchServices: PropTypes.func,
  errorMessage: PropTypes.string,
};

const stateTraceXformer = getLastXformCacher(stateTrace => {
  const { traces: traceMap, loading: loadingTraces, error: traceError } = stateTrace;
  const { traces, maxDuration } = getTraceSummaries(_values(traceMap));
  return { traces, maxDuration, traceError, loadingTraces };
});

const stateServicesXformer = getLastXformCacher(stateServices => {
  const {
    loading: loadingServices,
    services: serviceList,
    operationsForService: opsBySvc,
    error: serviceError,
  } = stateServices;
  const services =
    serviceList &&
    serviceList.map(name => ({
      name,
      operations: opsBySvc[name] || [],
    }));
  return { loadingServices, services, serviceError };
});

function mapStateToProps(state) {
  const query = queryString.parse(state.router.location.search);
  const isHomepage = !Object.keys(query).length;
  const { traces, maxDuration, traceError, loadingTraces } = stateTraceXformer(state.trace);
  const { loadingServices, services, serviceError } = stateServicesXformer(state.services);
  const errorMessage = serviceError || traceError ? `${serviceError || ''} ${traceError || ''}` : '';
  const sortBy = traceResultsFiltersFormSelector(state, 'sortBy');
  sortTraces(traces, sortBy);

  return {
    isHomepage,
    sortTracesBy: sortBy,
    traceResults: traces,
    numberOfTraceResults: traces.length,
    maxTraceDuration: maxDuration,
    urlQueryParams: query,
    services,
    loadingTraces,
    loadingServices,
    errorMessage,
  };
}

function mapDispatchToProps(dispatch) {
  const { searchTraces, fetchServices, fetchServiceOperations } = bindActionCreators(
    jaegerApiActions,
    dispatch
  );
  return {
    fetchServiceOperations,
    fetchServices,
    searchTraces,
  };
}
export const ConnectedSearchTracePage = connect(mapStateToProps, mapDispatchToProps)(SearchTracePage);
