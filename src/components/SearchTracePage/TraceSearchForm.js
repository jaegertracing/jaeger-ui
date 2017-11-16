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
import moment from 'moment';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Field, reduxForm, formValueSelector } from 'redux-form';
import store from 'store';

import SearchDropdownInput from './SearchDropdownInput';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { formatDate, formatTime } from '../../utils/date';

export function getUnixTimeStampInMSFromForm({ startDate, startDateTime, endDate, endDateTime }) {
  const start = `${startDate} ${startDateTime}`;
  const end = `${endDate} ${endDateTime}`;
  return {
    start: `${moment(start, 'YYYY-MM-DD HH:mm').valueOf()}000`,
    end: `${moment(end, 'YYYY-MM-DD HH:mm').valueOf()}000`,
  };
}

export function tagsToQuery(tags) {
  if (!tags) {
    return null;
  }
  return tags.split('|');
}

export function traceIDsToQuery(traceIDs) {
  if (!traceIDs) {
    return null;
  }
  return traceIDs.split(',');
}

export function convertQueryParamsToFormDates({ start, end }) {
  let queryStartDate;
  let queryStartDateTime;
  let queryEndDate;
  let queryEndDateTime;
  if (end) {
    const endUnix = moment(parseInt(end.replace('000', ''), 10));
    queryEndDate = formatDate(endUnix * 1000);
    queryEndDateTime = formatTime(endUnix * 1000);
  }
  if (start) {
    const startUnix = moment(parseInt(start.replace('000', ''), 10));
    queryStartDate = formatDate(startUnix * 1000);
    queryStartDateTime = formatTime(startUnix * 1000);
  }

  return {
    queryStartDate,
    queryStartDateTime,
    queryEndDate,
    queryEndDateTime,
  };
}

export function TraceSearchFormComponent(props) {
  const { selectedService = '-', selectedLookback, handleSubmit, submitting, services } = props;
  const selectedServicePayload = services.find(s => s.name === selectedService);
  const operationsForService = (selectedServicePayload && selectedServicePayload.operations) || [];
  const noSelectedService = selectedService === '-' || !selectedService;
  return (
    <div className="search-form">
      <form className="ui form" onSubmit={handleSubmit}>
        <div className="search-form--service field">
          <label htmlFor="service">Service</label>
          <Field
            id="service"
            name="service"
            component={SearchDropdownInput}
            className="ui dropdown"
            items={services.concat({ name: '-' }).map(v => ({ text: v.name, value: v.name, key: v.name }))}
          />
        </div>

        {!noSelectedService && (
          <div className="search-form--operation field">
            <Field
              name="operation"
              component={SearchDropdownInput}
              className="ui dropdown"
              items={operationsForService.concat('all').map(op => ({ text: op, value: op, key: op }))}
            />
          </div>
        )}

        <div className="search-form--tags field">
          <label htmlFor="tags">Tags</label>
          <div className="ui input">
            <Field
              name="tags"
              type="text"
              component="input"
              placeholder="http.status_code:400|http.status_code:200"
            />
          </div>
        </div>

        <div className="search-form--lookback field">
          <label htmlFor="lookback">Lookback</label>
          <Field name="lookback" className="ui dropdown" component="select">
            <option value="1h">Last Hour</option>
            <option value="2h">Last 2 Hours</option>
            <option value="3h">Last 3 Hours</option>
            <option value="6h">Last 6 Hours</option>
            <option value="12h">Last 12 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="2d">Last 2 Days</option>
            <option value="custom">Custom Time Range</option>
          </Field>
        </div>

        {selectedLookback === 'custom' && (
          <div className="search-form--start-time field">
            <label htmlFor="service">Start Time</label>
            <div>
              <div className="ui input">
                <Field name="startDate" component="input" type="date" placeholder="Start Date" />
              </div>
              <div className="ui input">
                <Field name="startDateTime" component="input" type="time" />
              </div>
            </div>
          </div>
        )}

        {selectedLookback === 'custom' && (
          <div className="search-form--end-time field">
            <label htmlFor="service">End time</label>
            <div>
              <div className="ui input">
                <Field name="endDate" component="input" type="date" placeholder="End Date" />
              </div>
              <div className="ui input">
                <Field name="endDateTime" component="input" type="time" />
              </div>
            </div>
          </div>
        )}

        <div className="two fields">
          <div className="field">
            <label htmlFor="minDuration">Min Duration</label>
            <div className="ui input">
              <Field name="minDuration" component="input" type="text" placeholder="e.g. 1.2s, 100ms, 500us" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="maxDuration">Max Duration</label>
            <div className="ui input">
              <Field name="maxDuration" component="input" type="text" placeholder="e.g. 1.1s" />
            </div>
          </div>
        </div>

        <div className="search-form--limit field">
          <label htmlFor="resultsLimit">Limit Results</label>
          <div className="ui input">
            <Field name="resultsLimit" component="input" type="number" placeholder="Limit Results" />
          </div>
        </div>
        <button className="ui button" type="submit" disabled={submitting || noSelectedService}>
          Find Traces
        </button>
      </form>
    </div>
  );
}

TraceSearchFormComponent.propTypes = {
  handleSubmit: PropTypes.func,
  submitting: PropTypes.bool,
  services: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      operations: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  selectedService: PropTypes.string,
  selectedLookback: PropTypes.string,
};

TraceSearchFormComponent.defaultProps = {
  services: [],
};

export const searchSideBarFormSelector = formValueSelector('searchSideBar');

const mapStateToProps = state => {
  const {
    service,
    limit,
    start,
    end,
    operation,
    tag: tagParams,
    maxDuration,
    minDuration,
    lookback,
    traceID: traceIDParams,
  } = queryString.parse(state.router.location.search);

  const nowInMicroseconds = moment().valueOf() * 1000;
  const today = formatDate(nowInMicroseconds);
  const currentTime = formatTime(nowInMicroseconds);
  const lastSearch = store.get('lastSearch');
  let lastSearchService;
  let lastSearchOperation;

  if (lastSearch) {
    // last search is only valid if the service is in the list of services
    const { operation: lastOp, service: lastSvc } = lastSearch;
    if (lastSvc && lastSvc !== '-') {
      if (state.services.services.includes(lastSvc)) {
        lastSearchService = lastSvc;
        if (lastOp && lastOp !== '-') {
          const ops = state.services.operationsForService[lastSvc];
          if (lastOp === 'all' || (ops && ops.includes(lastOp))) {
            lastSearchOperation = lastOp;
          }
        }
      }
    }
  }

  const {
    queryStartDate,
    queryStartDateTime,
    queryEndDate,
    queryEndDateTime,
  } = convertQueryParamsToFormDates({ start, end });

  let tags;
  if (tagParams) {
    tags = tagParams instanceof Array ? tagParams.join('|') : tagParams;
  }
  let traceIDs;
  if (traceIDParams) {
    traceIDs = traceIDParams instanceof Array ? traceIDParams.join(',') : traceIDParams;
  }

  return {
    destroyOnUnmount: false,
    initialValues: {
      service: service || lastSearchService || '-',
      resultsLimit: limit || 20,
      lookback: lookback || '1h',
      startDate: queryStartDate || today,
      startDateTime: queryStartDateTime || '00:00',
      endDate: queryEndDate || today,
      endDateTime: queryEndDateTime || currentTime,
      operation: operation || lastSearchOperation || 'all',
      tags,
      minDuration: minDuration || null,
      maxDuration: maxDuration || null,
      traceIDs: traceIDs || null,
    },
    selectedService: searchSideBarFormSelector(state, 'service'),
    selectedLookback: searchSideBarFormSelector(state, 'lookback'),
  };
};

const mapDispatchToProps = dispatch => {
  const { searchTraces } = bindActionCreators(jaegerApiActions, dispatch);
  return {
    onSubmit: fields => {
      const {
        resultsLimit,
        service,
        startDate,
        startDateTime,
        endDate,
        endDateTime,
        operation,
        tags,
        minDuration,
        maxDuration,
        lookback,
      } = fields;
      // Note: traceID is ignored when the form is submitted

      store.set('lastSearch', { service, operation });

      let start;
      let end;
      if (lookback !== 'custom') {
        const unit = lookback.split('').pop();
        start =
          moment()
            .subtract(parseInt(lookback, 10), unit)
            .valueOf() * 1000;
        end = moment().valueOf() * 1000;
      } else {
        const times = getUnixTimeStampInMSFromForm({
          startDate,
          startDateTime,
          endDate,
          endDateTime,
        });
        start = times.start;
        end = times.end;
      }

      searchTraces({
        service,
        operation: operation !== 'all' ? operation : undefined,
        limit: resultsLimit,
        lookback,
        start,
        end,
        tag: tagsToQuery(tags) || undefined,
        minDuration: minDuration || null,
        maxDuration: maxDuration || null,
      });
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(
  reduxForm({
    form: 'searchSideBar',
  })(TraceSearchFormComponent)
);
