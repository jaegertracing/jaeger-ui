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

import * as React from 'react';
import { Input, Button, Popover, Select, Row, Col, Form } from 'antd';
import _get from 'lodash/get';
import logfmtParser from 'logfmt/lib/logfmt_parser';
import { stringify as logfmtStringify } from 'logfmt/lib/stringify';
import dayjs from 'dayjs';
import memoizeOne from 'memoize-one';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { IoHelp } from 'react-icons/io5';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import store from 'store';

import * as markers from './SearchForm.markers';
import { trackFormInput } from './SearchForm.track';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { formatDate, formatTime } from '../../utils/date';
import {
  DEFAULT_OPERATION,
  DEFAULT_LIMIT,
  DEFAULT_LOOKBACK,
  CHANGE_SERVICE_ACTION_TYPE,
} from '../../constants/search-form';
import { getConfigValue } from '../../utils/config/get-config';
import SearchableSelect from '../common/SearchableSelect';
import './SearchForm.css';
import ValidatedFormField from '../../utils/ValidatedFormField';

const FormItem = Form.Item;
const Option = Select.Option;

export function getUnixTimeStampInMSFromForm({ startDate, startDateTime, endDate, endDateTime }) {
  const start = `${startDate} ${startDateTime}`;
  const end = `${endDate} ${endDateTime}`;
  return {
    start: `${dayjs(start, 'YYYY-MM-DD HH:mm').valueOf()}000`,
    end: `${dayjs(end, 'YYYY-MM-DD HH:mm').valueOf()}000`,
  };
}

export function convTagsLogfmt(tags) {
  if (!tags) {
    return null;
  }
  const data = logfmtParser.parse(tags);
  Object.keys(data).forEach(key => {
    const value = data[key];
    // make sure all values are strings
    // https://github.com/jaegertracing/jaeger/issues/550#issuecomment-352850811
    if (typeof value !== 'string') {
      data[key] = String(value);
    }
  });
  return JSON.stringify(data);
}

export function lookbackToTimestamp(lookback, from) {
  const unit = lookback.substr(-1);
  return dayjs(from).subtract(parseInt(lookback, 10), unit).valueOf() * 1000;
}

const lookbackOptions = [
  {
    label: '5 Minutes',
    value: '5m',
  },
  {
    label: '15 Minutes',
    value: '15m',
  },
  {
    label: '30 Minutes',
    value: '30m',
  },
  {
    label: 'Hour',
    value: '1h',
  },
  {
    label: '2 Hours',
    value: '2h',
  },
  {
    label: '3 Hours',
    value: '3h',
  },
  {
    label: '6 Hours',
    value: '6h',
  },
  {
    label: '12 Hours',
    value: '12h',
  },
  {
    label: '24 Hours',
    value: '24h',
  },
  {
    label: '2 Days',
    value: '2d',
  },
  {
    label: '3 Days',
    value: '3d',
  },
  {
    label: '5 Days',
    value: '5d',
  },
  {
    label: '7 Days',
    value: '7d',
  },
  {
    label: '2 Weeks',
    value: '2w',
  },
  {
    label: '3 Weeks',
    value: '3w',
  },
  {
    label: '4 Weeks',
    value: '4w',
  },
];

export const optionsWithinMaxLookback = memoizeOne(maxLookback => {
  const now = new Date();
  const minTimestamp = lookbackToTimestamp(maxLookback.value, now);
  const lookbackToTimestampMap = new Map();
  const options = lookbackOptions.filter(({ value }) => {
    const lookbackTimestamp = lookbackToTimestamp(value, now);
    lookbackToTimestampMap.set(value, lookbackTimestamp);
    return lookbackTimestamp >= minTimestamp;
  });
  const lastInRangeIndex = options.length - 1;
  const lastInRangeOption = options[lastInRangeIndex];
  if (lastInRangeOption.label !== maxLookback.label) {
    if (lookbackToTimestampMap.get(lastInRangeOption.value) !== minTimestamp) {
      options.push(maxLookback);
    } else {
      options.splice(lastInRangeIndex, 1, maxLookback);
    }
  }
  return options.map(({ label, value }) => (
    <Option key={value} value={value}>
      {`Last ${label}`}
    </Option>
  ));
});

export function traceIDsToQuery(traceIDs) {
  if (!traceIDs) {
    return null;
  }
  return traceIDs.split(',');
}

export const placeholderDurationFields = 'e.g. 1.2s, 100ms, 500us';
export function validateDurationFields(value) {
  if (!value) return undefined;
  return /\d[\d\\.]*(us|ms|s|m|h)$/.test(value)
    ? undefined
    : {
        content: `Please enter a number followed by a duration unit, ${placeholderDurationFields}`,
        title: 'Please match the requested format.',
      };
}

export function convertQueryParamsToFormDates({ start, end }) {
  let queryStartDate;
  let queryStartDateTime;
  let queryEndDate;
  let queryEndDateTime;
  if (end) {
    const endUnixNs = parseInt(end, 10);
    queryEndDate = formatDate(endUnixNs);
    queryEndDateTime = formatTime(endUnixNs);
  }
  if (start) {
    const startUnixNs = parseInt(start, 10);
    queryStartDate = formatDate(startUnixNs);
    queryStartDateTime = formatTime(startUnixNs);
  }

  return {
    queryStartDate,
    queryStartDateTime,
    queryEndDate,
    queryEndDateTime,
  };
}

export function submitForm(fields, searchTraces) {
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
    const now = new Date();
    start = lookbackToTimestamp(lookback, now);
    end = now * 1000;
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

  trackFormInput(resultsLimit, operation, tags, minDuration, maxDuration, lookback, service);

  searchTraces({
    service,
    operation: operation !== DEFAULT_OPERATION ? operation : undefined,
    limit: resultsLimit,
    lookback,
    start,
    end,
    tags: convTagsLogfmt(tags) || undefined,
    minDuration: minDuration || null,
    maxDuration: maxDuration || null,
  });
}

export class SearchFormImpl extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      formData: {
        service: this.props.initialValues?.service,
        operation: this.props.initialValues?.operation,
        tags: this.props.initialValues?.tags,
        lookback: this.props.initialValues?.lookback,
        startDate: this.props.initialValues?.startDate,
        startDateTime: this.props.initialValues?.startDateTime,
        endDate: this.props.initialValues?.endDate,
        endDateTime: this.props.initialValues?.endDateTime,
        minDuration: this.props.initialValues?.minDuration,
        maxDuration: this.props.initialValues?.maxDuration,
        resultsLimit: this.props.initialValues?.resultsLimit,
      },
    };
  }

  handleChange = fieldData => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        ...fieldData,
      },
    }));
    if (fieldData.service) {
      this.props.changeServiceHandler(fieldData.service);
      this.setState(prevState => ({
        formData: {
          ...prevState.formData,
          operation: DEFAULT_OPERATION,
        },
      }));
    }
  };

  handleSubmit = e => {
    e.preventDefault();
    this.props.submitFormHandler(this.state.formData);
  };

  render() {
    const { invalid, searchMaxLookback, services, submitting } = this.props;
    const { formData } = this.state;
    const { service: selectedService, lookback: selectedLookback } = formData;
    const selectedServicePayload = services.find(s => s.name === selectedService);
    const opsForSvc = (selectedServicePayload && selectedServicePayload.operations) || [];
    const noSelectedService = selectedService === '-' || !selectedService;
    const tz = selectedLookback === 'custom' ? new Date().toTimeString().replace(/^.*?GMT/, 'UTC') : null;
    const invalidDuration =
      validateDurationFields(formData.minDuration) || validateDurationFields(formData.maxDuration);

    return (
      <Form layout="vertical" onSubmitCapture={this.handleSubmit}>
        <FormItem
          label={
            <span>
              Service <span className="SearchForm--labelCount">({services.length})</span>
            </span>
          }
        >
          <SearchableSelect
            name="service"
            value={this.state.formData.service}
            placeholder="Select A Service"
            disabled={submitting}
            onChange={value => this.handleChange({ service: value })}
          >
            {services.map(service => (
              <Option key={service.name} value={service.name}>
                {service.name}
              </Option>
            ))}
          </SearchableSelect>
        </FormItem>
        <FormItem
          label={
            <span>
              Operation <span className="SearchForm--labelCount">({opsForSvc ? opsForSvc.length : 0})</span>
            </span>
          }
        >
          <SearchableSelect
            name="operation"
            value={this.state.formData.operation}
            disabled={submitting || noSelectedService}
            placeholder="Select An Operation"
            onChange={value => this.handleChange({ operation: value })}
          >
            {['all'].concat(opsForSvc).map(op => (
              <Option key={op} value={op}>
                {op}
              </Option>
            ))}
          </SearchableSelect>
        </FormItem>

        <FormItem
          label={
            <div>
              Tags{' '}
              <Popover
                placement="topLeft"
                trigger="click"
                title={
                  <h3 key="title" className="SearchForm--tagsHintTitle">
                    Values should be in the{' '}
                    <a href="https://brandur.org/logfmt" rel="noopener noreferrer" target="_blank">
                      logfmt
                    </a>{' '}
                    format.
                  </h3>
                }
                content={
                  <div>
                    <ul key="info" className="SearchForm--tagsHintInfo">
                      <li>Use space for AND conjunctions.</li>
                      <li>
                        Values containing whitespace or equal-sign &apos;=&apos; should be enclosed in quotes.
                      </li>
                      <li>
                        Elasticsearch/OpenSearch storage supports regex query, therefore{' '}
                        <a
                          href="https://lucene.apache.org/core/9_0_0/core/org/apache/lucene/util/automaton/RegExp.html"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          reserved characters
                        </a>{' '}
                        need to be escaped for exact match queries.
                      </li>
                    </ul>
                    <p>Examples:</p>
                    <ul className="SearchForm--tagsHintInfo">
                      <li>
                        <code className="SearchForm--tagsHintEg">error=true</code>
                      </li>
                      <li>
                        <code className="SearchForm--tagsHintEg">
                          db.statement=&quot;select * from User&quot;
                        </code>
                      </li>
                      <li>
                        <code className="SearchForm--tagsHintEg">
                          http.url=&quot;http://0.0.0.0:8081/customer\\?customer=123&quot;
                        </code>
                        <div>
                          Note: when using Elasticsearch/OpenSearch the{' '}
                          <a
                            href="https://lucene.apache.org/core/9_0_0/core/org/apache/lucene/util/automaton/RegExp.html"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            regex-reserved
                          </a>{' '}
                          character <code className="SearchForm--tagsHintEg">&quot;?&quot;</code> must be
                          escaped with <code className="SearchForm--tagsHintEg">&quot;\\&quot;</code>.
                        </div>
                      </li>
                    </ul>
                  </div>
                }
              >
                <IoHelp className="SearchForm--hintTrigger" />
              </Popover>
            </div>
          }
        >
          <Input
            name="tags"
            value={this.state.formData.tags}
            disabled={submitting}
            placeholder="http.status_code=200 error=true"
            onChange={e => this.handleChange({ tags: e.target.value })}
          />
        </FormItem>

        <FormItem label="Lookback">
          <SearchableSelect
            name="lookback"
            value={this.state.formData.lookback}
            disabled={submitting}
            defaultValue={DEFAULT_LOOKBACK}
            onChange={value => this.handleChange({ lookback: value })}
          >
            {optionsWithinMaxLookback(searchMaxLookback)}
            <Option value="custom">Custom Time Range</Option>
          </SearchableSelect>
        </FormItem>

        {selectedLookback === 'custom' && [
          <FormItem
            key="start"
            label={
              <div>
                Start Time{' '}
                <Popover
                  placement="topLeft"
                  trigger="click"
                  content={
                    <h3 key="title" className="SearchForm--tagsHintTitle">
                      Times are expressed in {tz}
                    </h3>
                  }
                >
                  <IoHelp className="SearchForm--hintTrigger" />
                </Popover>
              </div>
            }
          >
            <Row gutter={16}>
              <Col className="gutter-row" span={14}>
                <Input
                  name="startDate"
                  value={this.state.formData.startDate}
                  disabled={submitting}
                  type="date"
                  placeholder="Start Date"
                  onChange={e => this.handleChange({ startDate: e.target.value })}
                />
              </Col>

              <Col className="gutter-row" span={10}>
                <Input
                  name="startDateTime"
                  value={this.state.formData.startDateTime}
                  disabled={submitting}
                  type="time"
                  onChange={e => this.handleChange({ startDateTime: e.target.value })}
                />
              </Col>
            </Row>
          </FormItem>,

          <FormItem
            key="end"
            label={
              <div>
                End Time{' '}
                <Popover
                  placement="topLeft"
                  trigger="click"
                  content={
                    <h3 key="title" className="SearchForm--tagsHintTitle">
                      Times are expressed in {tz}
                    </h3>
                  }
                >
                  <IoHelp className="SearchForm--hintTrigger" />
                </Popover>
              </div>
            }
          >
            <Row gutter={16}>
              <Col className="gutter-row" span={14}>
                <Input
                  name="endDate"
                  value={this.state.formData.endDate}
                  disabled={submitting}
                  type="date"
                  placeholder="End Date"
                  onChange={e => this.handleChange({ endDate: e.target.value })}
                />
              </Col>

              <Col className="gutter-row" span={10}>
                <Input
                  name="endDateTime"
                  value={this.state.formData.endDateTime}
                  disabled={submitting}
                  type="time"
                  onChange={e => this.handleChange({ endDateTime: e.target.value })}
                />
              </Col>
            </Row>
          </FormItem>,
        ]}

        <Row gutter={16}>
          <Col className="gutter-row" span={12}>
            <FormItem label="Max Duration">
              <ValidatedFormField
                name="maxDuration"
                value={this.state.formData.maxDuration}
                disabled={submitting}
                validate={validateDurationFields}
                placeholder={placeholderDurationFields}
                onChange={e => this.handleChange({ maxDuration: e.target.value })}
              />
            </FormItem>
          </Col>

          <Col className="gutter-row" span={12}>
            <FormItem label="Min Duration">
              <ValidatedFormField
                name="minDuration"
                value={this.state.formData.minDuration}
                disabled={submitting}
                validate={validateDurationFields}
                placeholder={placeholderDurationFields}
                onChange={e => this.handleChange({ minDuration: e.target.value })}
              />
            </FormItem>
          </Col>
        </Row>

        <FormItem label="Limit Results">
          <Input
            name="resultsLimit"
            value={this.state.formData.resultsLimit}
            disabled={submitting}
            type="number"
            placeholder="Limit Results"
            min={1}
            max={getConfigValue('search.maxLimit')}
            onChange={e => this.handleChange({ resultsLimit: e.target.value })}
          />
        </FormItem>

        <Button
          htmlType="submit"
          className="SearchForm--submit"
          disabled={submitting || noSelectedService || invalid || invalidDuration}
          data-test={markers.SUBMIT_BTN}
        >
          Find Traces
        </Button>
      </Form>
    );
  }
}

SearchFormImpl.propTypes = {
  invalid: PropTypes.bool,
  submitting: PropTypes.bool,
  searchMaxLookback: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
  services: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      operations: PropTypes.arrayOf(PropTypes.string),
    })
  ),
};

SearchFormImpl.defaultProps = {
  invalid: false,
  services: [],
  submitting: false,
};

export function mapStateToProps(state) {
  const {
    service,
    limit,
    start,
    end,
    operation,
    tag: tagParams,
    tags: logfmtTags,
    maxDuration,
    minDuration,
    lookback,
    traceID: traceIDParams,
  } = queryString.parse(state.router.location.search);

  const nowInMicroseconds = dayjs().valueOf() * 1000;
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

  const { queryStartDate, queryStartDateTime, queryEndDate, queryEndDateTime } =
    convertQueryParamsToFormDates({ start, end });

  let tags;
  // continue to parse tagParams to remain backward compatible with older URLs
  // but, parse to logfmt format instead of the former "key:value|k2:v2"
  if (tagParams) {
    function convFormerTag(accum, value) {
      const parts = value.split(':', 2);
      const key = parts[0];
      if (key) {
        accum[key] = parts[1] == null ? '' : parts[1];
        return true;
      }
      return false;
    }

    let data;
    if (Array.isArray(tagParams)) {
      data = tagParams.reduce((accum, str) => {
        convFormerTag(accum, str);
        return accum;
      }, {});
    } else if (typeof tagParams === 'string') {
      const target = {};
      data = convFormerTag(target, tagParams) ? target : null;
    }
    if (data) {
      try {
        tags = logfmtStringify(data);
      } catch (_) {
        tags = 'Parse Error';
      }
    } else {
      tags = 'Parse Error';
    }
  }
  if (logfmtTags) {
    let data;
    try {
      data = JSON.parse(logfmtTags);
      tags = logfmtStringify(data);
    } catch (_) {
      tags = 'Parse Error';
    }
  }
  let traceIDs;
  if (traceIDParams) {
    traceIDs = traceIDParams instanceof Array ? traceIDParams.join(',') : traceIDParams;
  }

  return {
    destroyOnUnmount: false,
    initialValues: {
      service: service || lastSearchService || '-',
      resultsLimit: limit || DEFAULT_LIMIT,
      lookback: lookback || DEFAULT_LOOKBACK,
      startDate: queryStartDate || today,
      startDateTime: queryStartDateTime || '00:00',
      endDate: queryEndDate || today,
      endDateTime: queryEndDateTime || currentTime,
      operation: operation || lastSearchOperation || DEFAULT_OPERATION,
      tags,
      minDuration: minDuration || null,
      maxDuration: maxDuration || null,
      traceIDs: traceIDs || null,
    },
    searchMaxLookback: _get(state, 'config.search.maxLookback'),
  };
}

export function mapDispatchToProps(dispatch) {
  const { searchTraces } = bindActionCreators(jaegerApiActions, dispatch);
  return {
    changeServiceHandler: service =>
      dispatch({
        type: CHANGE_SERVICE_ACTION_TYPE,
        payload: service,
      }),
    submitFormHandler: fields => submitForm(fields, searchTraces),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchFormImpl);
