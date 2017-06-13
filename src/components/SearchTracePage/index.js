// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Field, reduxForm, formValueSelector } from 'redux-form';
import { Link } from 'react-router';
import { Sticky } from 'react-sticky';
import * as jaegerApiActions from '../../actions/jaeger-api';

import JaegerLogo from '../../img/jaeger-logo.svg';

import TraceSearchForm from './TraceSearchForm';
import TraceSearchResult from './TraceSearchResult';
import TraceResultsScatterPlot from './TraceResultsScatterPlot';
import {
  transformTraceResultsSelector,
  getSortedTraceResults,
  LONGEST_FIRST,
  SHORTEST_FIRST,
  MOST_SPANS,
  LEAST_SPANS,
  MOST_RECENT,
} from '../../selectors/search';
import { getPercentageOfDuration } from '../../utils/date';

/**
 * Contains the dropdown to sort and filter trace search results
 */
let TraceResultsFilterForm = () => (
  <div className="ui form">
    <div className="field inline">
      <label htmlFor="traceResultsSortBy">Sort</label>
      <Field
        name="sortBy"
        id="traceResultsSortBy"
        className="ui dropdown"
        component="select"
      >
        <option value={MOST_RECENT}>Most Recent</option>
        <option value={LONGEST_FIRST}>Longest First</option>
        <option value={SHORTEST_FIRST}>Shortest First</option>
        <option value={MOST_SPANS}>Most Spans</option>
        <option value={LEAST_SPANS}>Least Spans</option>
      </Field>
    </div>
  </div>
);
TraceResultsFilterForm = reduxForm({
  form: 'traceResultsFilters',
  initialValues: {
    sortBy: MOST_RECENT,
  },
})(TraceResultsFilterForm);
const traceResultsFiltersFormSelector = formValueSelector(
  'traceResultsFilters'
);

export default class SearchTracePage extends Component {
  componentDidMount() {
    const { searchTraces, urlQueryParams, fetchServices } = this.props;
    if (urlQueryParams.service || urlQueryParams.traceID) {
      searchTraces(urlQueryParams);
    }
    fetchServices();
  }
  render() {
    const {
      traceResults,
      services,
      numberOfTraceResults,
      maxTraceDuration,
      loading,
      errorMessage,
      isHomepage,
    } = this.props;
    const hasTraceResults = traceResults && traceResults.length > 0;
    return (
      <div className="trace-search ui grid padded">
        <div className="four wide column">
          <Sticky
            topOffset={-60}
            stickyStyle={{ top: 'calc(40px + 1rem)', zIndex: 1000 }}
          >
            <div
              className="ui tertiary segment"
              style={{ background: 'whitesmoke' }}
            >
              <h3>Find Traces</h3>
              <TraceSearchForm services={services} />
            </div>
          </Sticky>
        </div>
        <div className="twelve wide column padded">
          {loading && <div className="ui active centered inline loader" />}
          {errorMessage &&
            !loading &&
            <div className="ui message red trace-search--error">
              There was an error querying for traces:<br />
              {errorMessage}
            </div>}
          {isHomepage &&
            !hasTraceResults &&
            <div
              className="ui middle aligned center aligned grid"
              style={{ marginTop: 100 }}
            >
              <div className="column">
                <img alt="presentation" src={JaegerLogo} width="400" />
              </div>
            </div>}
          {!isHomepage &&
            !hasTraceResults &&
            !loading &&
            !errorMessage &&
            <div className="ui message trace-search--no-results">
              No trace results. Try another query.
            </div>}
          {hasTraceResults &&
            !loading &&
            <div>
              <div>
                <div style={{ border: '1px solid #e6e6e6' }}>
                  <div className="p2">
                    <TraceResultsScatterPlot
                      data={traceResults.map(t => ({
                        x: t.timestamp,
                        y: t.duration,
                        traceID: t.traceID,
                      }))}
                      onValueClick={t => {
                        this.props.history.push(`/trace/${t.traceID}`);
                      }}
                    />
                  </div>
                  <div
                    className="p2 clearfix"
                    style={{ backgroundColor: 'whitesmoke' }}
                  >
                    <div className="left">
                      <span>
                        {numberOfTraceResults}
                        {' '}
                        Trace
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
                      <Link to={`/trace/${trace.traceID}`}>
                        <TraceSearchResult
                          trace={trace}
                          durationPercent={getPercentageOfDuration(
                            trace.duration,
                            maxTraceDuration
                          )}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>}
        </div>
      </div>
    );
  }
}

SearchTracePage.propTypes = {
  isHomepage: PropTypes.bool,
  traceResults: PropTypes.array,
  numberOfTraceResults: PropTypes.number,
  maxTraceDuration: PropTypes.number,
  loading: PropTypes.bool,
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
  fetchServices: PropTypes.func,
  errorMessage: PropTypes.string,
};

function mapStateToProps(state) {
  const query = state.routing.locationBeforeTransitions.query;
  const isHomepage = !Object.keys(query).length;
  const { traces: traceMap, loading, error: traceError } = state.trace.toJS();
  const {
    services,
    operationsForService,
    error: serviceError,
  } = state.services.toJS();
  const traceResults = Object.keys(traceMap).map(traceID => traceMap[traceID]);
  const sortBy = traceResultsFiltersFormSelector(state, 'sortBy');
  const { traces, maxDuration } = transformTraceResultsSelector({
    traces: traceResults,
  });
  const traceResultsSorted = getSortedTraceResults(traces, sortBy);
  const errorMessage = serviceError || traceError
    ? `${serviceError || ''} ${traceError || ''}`
    : '';

  return {
    isHomepage,
    sortTracesBy: sortBy,
    traceResults: traceResultsSorted,
    numberOfTraceResults: traceResultsSorted.length,
    maxTraceDuration: maxDuration,
    urlQueryParams: query,
    services: services.map(serviceName => ({
      name: serviceName,
      operations: operationsForService[serviceName] || [],
    })),
    loading,
    errorMessage,
  };
}

function mapDispatchToProps(dispatch) {
  const { searchTraces, fetchServices } = bindActionCreators(
    jaegerApiActions,
    dispatch
  );

  return {
    searchTraces,
    fetchServices,
  };
}
export const ConnectedSearchTracePage = connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchTracePage);
