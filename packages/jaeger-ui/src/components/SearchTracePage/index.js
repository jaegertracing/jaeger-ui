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
import { Col, Row } from 'antd';
import _values from 'lodash/values';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import store from 'store';

import * as jaegerApiActions from '../../actions/jaeger-api';
import SearchForm from './SearchForm';
import SearchResults, { sortFormSelector } from './SearchResults';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { sortTraces, getTraceSummaries } from '../../model/search';
import getLastXformCacher from '../../utils/get-last-xform-cacher';
import prefixUrl from '../../utils/prefix-url';

import './index.css';
import JaegerLogo from '../../img/jaeger-logo.svg';

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

  goToTrace = traceID => {
    this.props.history.push(prefixUrl(`/trace/${traceID}`));
  };

  render() {
    const {
      errors,
      isHomepage,
      loadingServices,
      loadingTraces,
      maxTraceDuration,
      services,
      traceResults,
    } = this.props;
    const hasTraceResults = traceResults && traceResults.length > 0;
    const showErrors = errors && !loadingTraces;
    const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors;
    return (
      <div>
        <Row>
          <Col span={6} className="SearchTracePage--column">
            <div className="SearchTracePage--find">
              <h2>Find Traces</h2>
              {!loadingServices && services ? <SearchForm services={services} /> : <LoadingIndicator />}
            </div>
          </Col>
          <Col span={18} className="SearchTracePage--column">
            {showErrors && (
              <div className="js-test-error-message">
                <h2>There was an error querying for traces:</h2>
                {errors.map(err => <ErrorMessage key={err.message} error={err} />)}
              </div>
            )}
            {showLogo && (
              <img
                className="SearchTracePage--logo js-test-logo"
                alt="presentation"
                src={JaegerLogo}
                width="400"
              />
            )}
            {!showErrors &&
              !showLogo && (
                <SearchResults
                  goToTrace={this.goToTrace}
                  loading={loadingTraces}
                  maxTraceDuration={maxTraceDuration}
                  traces={traceResults}
                />
              )}
          </Col>
        </Row>
      </div>
    );
  }
}

SearchTracePage.propTypes = {
  isHomepage: PropTypes.bool,
  // eslint-disable-next-line react/forbid-prop-types
  traceResults: PropTypes.array,
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
  errors: PropTypes.arrayOf(
    PropTypes.shape({
      message: PropTypes.string,
    })
  ),
};

const stateTraceXformer = getLastXformCacher(stateTrace => {
  const { traces: traceMap, loading: loadingTraces, error: traceError } = stateTrace;
  const { traces, maxDuration } = getTraceSummaries(_values(traceMap));
  return { traces, maxDuration, traceError, loadingTraces };
});

const sortedTracesXformer = getLastXformCacher((traces, sortBy) => {
  const traceResults = traces.slice();
  sortTraces(traceResults, sortBy);
  return traceResults;
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

// export to test
export function mapStateToProps(state) {
  const query = queryString.parse(state.router.location.search);
  const isHomepage = !Object.keys(query).length;
  const { traces, maxDuration, traceError, loadingTraces } = stateTraceXformer(state.trace);
  const { loadingServices, services, serviceError } = stateServicesXformer(state.services);
  const errors = [];
  if (traceError) {
    errors.push(traceError);
  }
  if (serviceError) {
    errors.push(serviceError);
  }
  const sortBy = sortFormSelector(state, 'sortBy');
  const traceResults = sortedTracesXformer(traces, sortBy);
  return {
    isHomepage,
    services,
    traceResults,
    loadingTraces,
    loadingServices,
    errors: errors.length ? errors : null,
    maxTraceDuration: maxDuration,
    sortTracesBy: sortBy,
    urlQueryParams: query,
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
