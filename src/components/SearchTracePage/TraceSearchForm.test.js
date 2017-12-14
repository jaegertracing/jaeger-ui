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

/* eslint-disable import/first */
jest.mock('store');

import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';
import queryString from 'query-string';
import store from 'store';

import {
  convertQueryParamsToFormDates,
  getUnixTimeStampInMSFromForm,
  mapStateToProps,
  submitForm,
  tagsToQuery,
  traceIDsToQuery,
  TraceSearchFormImpl as TraceSearchForm,
} from './TraceSearchForm';

function makeDateParams(dateOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dateOffset || 0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = [date.getFullYear(), '-', month < 10 ? '0' : '', month, '-', day < 10 ? '0' : '', day].join(
    ''
  );
  return {
    date,
    dateStr,
    dateTimeStr: date.toTimeString().slice(0, 5),
  };
}

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';
const defaultProps = {
  services: [{ name: 'svcA', operations: ['A', 'B'] }, { name: 'svcB', operations: ['A', 'B'] }],
  dataCenters: ['dc1'],
};

describe('conversion utils', () => {
  describe('getUnixTimeStampInMSFromForm()', () => {
    it('converts correctly', () => {
      const { date: startSrc, dateStr: startDate, dateTimeStr: startDateTime } = makeDateParams(-1);
      const { date: endSrc, dateStr: endDate, dateTimeStr: endDateTime } = makeDateParams(0);
      const { start, end } = getUnixTimeStampInMSFromForm({
        startDate,
        startDateTime,
        endDate,
        endDateTime,
      });
      expect(start).toBe(`${startSrc.valueOf()}000`);
      expect(end).toBe(`${endSrc.valueOf()}000`);
    });
  });

  describe('convertQueryParamsToFormDates()', () => {
    it('converts correctly', () => {
      const startMoment = moment().subtract(1, 'day');
      const endMoment = moment();
      const params = {
        start: `${startMoment.valueOf()}000`,
        end: `${endMoment.valueOf()}000`,
      };

      const {
        queryStartDate,
        queryStartDateTime,
        queryEndDate,
        queryEndDateTime,
      } = convertQueryParamsToFormDates(params);
      expect(queryStartDate).toBe(startMoment.format(DATE_FORMAT));
      expect(queryStartDateTime).toBe(startMoment.format(TIME_FORMAT));
      expect(queryEndDate).toBe(endMoment.format(DATE_FORMAT));
      expect(queryEndDateTime).toBe(endMoment.format(TIME_FORMAT));
    });
  });

  describe('tagsToQuery()', () => {
    it('splits on "|"', () => {
      const strs = ['a', 'b', 'c'];
      expect(tagsToQuery(strs.join('|'))).toEqual(strs);
    });
  });

  describe('traceIDsToQuery()', () => {
    it('splits on ","', () => {
      const strs = ['a', 'b', 'c'];
      expect(traceIDsToQuery(strs.join(','))).toEqual(strs);
    });
  });
});

describe('submitForm()', () => {
  const LOOKBACK_VALUE = 2;
  const LOOKBACK_UNIT = 'd';
  let searchTraces;
  let fields;

  beforeEach(() => {
    searchTraces = jest.fn();
    fields = {
      lookback: `${LOOKBACK_VALUE}${LOOKBACK_UNIT}`,
      operation: 'op-a',
      resultsLimit: 20,
      service: 'svc-a',
      tags: 'a|b',
    };
  });

  it('ignores `fields.operation` when it is "all"', () => {
    fields.operation = 'all';
    submitForm(fields, searchTraces);
    const { calls } = searchTraces.mock;
    expect(calls.length).toBe(1);
    const { operation } = calls[0][0];
    expect(operation).toBe(undefined);
  });

  describe('`fields.lookback`', () => {
    it('subtracts `lookback` from `fields.end`', () => {
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { start, end } = calls[0][0];
      const diffMs = (Number(end) - Number(start)) / 1000;
      const duration = moment.duration(diffMs);
      expect(duration.asDays()).toBe(LOOKBACK_VALUE);
    });

    it('processes form dates when `lookback` is "custom"', () => {
      const { date: startSrc, dateStr: startDate, dateTimeStr: startDateTime } = makeDateParams(-1);
      const { date: endSrc, dateStr: endDate, dateTimeStr: endDateTime } = makeDateParams(0);
      fields = {
        ...fields,
        startDate,
        startDateTime,
        endDate,
        endDateTime,
        lookback: 'custom',
      };
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { start, end } = calls[0][0];
      expect(start).toBe(`${startSrc.valueOf()}000`);
      expect(end).toBe(`${endSrc.valueOf()}000`);
    });
  });

  describe('`fields.tag`', () => {
    it('is ignored when `fields.tags` is falsy', () => {
      fields.tags = undefined;
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { tag } = calls[0][0];
      expect(tag).toBe(undefined);
    });

    it('is parsed `fields.tags` is truthy', () => {
      const tagStrs = ['a', 'b'];
      fields.tags = tagStrs.join('|');
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { tag } = calls[0][0];
      expect(tag).toEqual(tagStrs);
    });
  });

  describe('`fields.{minDuration,maxDuration}', () => {
    it('retains values as-is when they are truthy', () => {
      fields.minDuration = 'some-min';
      fields.maxDuration = 'some-max';
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { minDuration, maxDuration } = calls[0][0];
      expect(minDuration).toBe(fields.minDuration);
      expect(maxDuration).toBe(fields.maxDuration);
    });

    it('omits values when they are falsy', () => {
      fields.minDuation = undefined;
      fields.maxDuation = undefined;
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { minDuration, maxDuration } = calls[0][0];
      expect(minDuration).toBe(null);
      expect(maxDuration).toBe(null);
    });
  });
});

describe('<TraceSearchForm>', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<TraceSearchForm {...defaultProps} />);
  });

  it('shows operations only when a service is selected', () => {
    expect(wrapper.find('.search-form--operation').length).toBe(0);

    wrapper = shallow(<TraceSearchForm {...defaultProps} selectedService="svcA" />);
    expect(wrapper.find('.search-form--operation').length).toBe(1);
  });

  it('shows custom date inputs when `props.selectedLookback` is "custom"', () => {
    function getDateFieldLengths(compWrapper) {
      return [compWrapper.find('.js-test-start-input').length, compWrapper.find('.js-test-end-input').length];
    }
    expect(getDateFieldLengths(wrapper)).toEqual([0, 0]);
    wrapper = shallow(<TraceSearchForm {...defaultProps} selectedLookback="custom" />);
    expect(getDateFieldLengths(wrapper)).toEqual([1, 1]);
  });

  it('disables the submit button when a service is not selected', () => {
    let btn = wrapper.find('.js-test-submit-btn');
    expect(btn.prop('disabled')).toBeTruthy();
    wrapper = shallow(<TraceSearchForm {...defaultProps} selectedService="svcA" />);
    btn = wrapper.find('.js-test-submit-btn');
    expect(btn.prop('disabled')).toBeFalsy();
  });
});

describe('mapStateToProps()', () => {
  let state;

  beforeEach(() => {
    state = { router: { location: { serach: '' } } };
  });

  it('does not explode when the query string is empty', () => {
    expect(() => mapStateToProps(state)).not.toThrow();
  });

  // tests the green path
  it('service and operation fallback to values in `store` when the values are valid', () => {
    const oldStoreGet = store.get;
    const op = 'some-op';
    const svc = 'some-svc';
    state.services = {
      services: [svc, 'something-else'],
      operationsForService: {
        [svc]: [op, 'some other opertion'],
      },
    };
    store.get = () => ({ operation: op, service: svc });
    const { service, operation } = mapStateToProps(state).initialValues;
    expect(operation).toBe(op);
    expect(service).toBe(svc);
    store.get = oldStoreGet;
  });

  it('derives values from `state.router.location.search` when available', () => {
    const { date: startSrc, dateStr: startDate, dateTimeStr: startDateTime } = makeDateParams(-1);
    const { date: endSrc, dateStr: endDate, dateTimeStr: endDateTime } = makeDateParams(0);
    const common = {
      lookback: '2h',
      maxDuration: null,
      minDuration: null,
      operation: 'Driver::findNearest',
      service: 'driver',
    };
    const params = {
      ...common,
      end: `${endSrc.valueOf()}000`,
      limit: '999',
      start: `${startSrc.valueOf()}000`,
      tag: ['error:true', 'span.kind:client'],
    };
    const expected = {
      ...common,
      endDate,
      endDateTime,
      startDate,
      startDateTime,
      resultsLimit: params.limit,
      tags: params.tag.join('|'),
      traceIDs: null,
    };

    state.router.location.search = queryString.stringify(params);
    expect(mapStateToProps(state).initialValues).toEqual(expected);
  });

  it('fallsback to default values', () => {
    // convert time string to number of minutes in day
    function msDiff(aDate, aTime, bDate, bTime) {
      const a = new Date(`${aDate}T${aTime}`);
      const b = new Date(`${bDate}T${bTime}`);
      return Math.abs(a - b);
    }
    const dateParams = makeDateParams(0);
    const { startDate, startDateTime, endDate, endDateTime, ...values } = mapStateToProps(
      state
    ).initialValues;

    expect(values).toEqual({
      service: '-',
      resultsLimit: 20,
      lookback: '1h',
      operation: 'all',
      tags: undefined,
      minDuration: null,
      maxDuration: null,
      traceIDs: null,
    });
    expect(startDate).toBe(dateParams.dateStr);
    expect(startDateTime).toBe('00:00');
    // expect the time differential between our `makeDateparams()` and the mapStateToProps values to be
    // within 60 seconds (CI tests run slowly)
    expect(msDiff(dateParams.dateStr, '00:00', startDate, startDateTime)).toBeLessThan(60 * 1000);
    expect(msDiff(dateParams.dateStr, dateParams.dateTimeStr, endDate, endDateTime)).toBeLessThan(60 * 1000);
  });
});
