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

jest.mock('store');

import React from 'react';
import { shallow } from 'enzyme';
import dayjs from 'dayjs';
import queryString from 'query-string';
import store from 'store';
import sinon from 'sinon';
import * as jaegerApiActions from '../../actions/jaeger-api';

import {
  convertQueryParamsToFormDates,
  convTagsLogfmt,
  getUnixTimeStampInMSFromForm,
  lookbackToTimestamp,
  mapDispatchToProps,
  mapStateToProps,
  optionsWithinMaxLookback,
  submitForm,
  traceIDsToQuery,
  SearchFormImpl as SearchForm,
  validateDurationFields,
} from './SearchForm';
import * as markers from './SearchForm.markers';
import getConfig from '../../utils/config/get-config';
import { CHANGE_SERVICE_ACTION_TYPE } from '../../constants/search-form';

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

const defaultProps = {
  dataCenters: ['dc1'],
  handleSubmit: () => {},
  searchMaxLookback: {
    label: '2 Days',
    value: '2d',
  },
  services: [
    { name: 'svcA', operations: ['A', 'B'] },
    { name: 'svcB', operations: ['A', 'B'] },
  ],
  changeServiceHandler: () => {},
  submitFormHandler: () => {},
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
      const { queryStartDate, queryStartDateTime, queryEndDate, queryEndDateTime } =
        convertQueryParamsToFormDates({
          start: '946720800000000', // Jan 1, 2000 10:00 AM
          end: '946807200000000', // Jan 2, 2000 10:00 AM
        });

      expect(queryStartDate).toBe('2000-01-01');
      expect(queryStartDateTime).toBe('10:00');
      expect(queryEndDate).toBe('2000-01-02');
      expect(queryEndDateTime).toBe('10:00');
    });
  });

  describe('convTagsLogfmt()', () => {
    it('converts logfmt formatted string to JSON', () => {
      const input = 'http.status_code=404 span.kind=client key="with a long value"';
      const target = JSON.stringify({
        'http.status_code': '404',
        'span.kind': 'client',
        key: 'with a long value',
      });
      expect(convTagsLogfmt(input)).toBe(target);
    });

    // https://github.com/jaegertracing/jaeger/issues/550#issuecomment-352850811
    it('converts all values to strings', () => {
      const input = 'aBoolKey error=true num=9';
      const target = JSON.stringify({
        aBoolKey: 'true',
        error: 'true',
        num: '9',
      });
      expect(convTagsLogfmt(input)).toBe(target);
    });
  });

  describe('traceIDsToQuery()', () => {
    it('splits on ","', () => {
      const strs = ['a', 'b', 'c'];
      expect(traceIDsToQuery(strs.join(','))).toEqual(strs);
    });
  });
});

describe('lookback utils', () => {
  describe('lookbackToTimestamp', () => {
    const hourInMicroseconds = 60 * 60 * 1000 * 1000;
    const now = new Date();
    const nowInMicroseconds = now * 1000;

    it('creates timestamp for hours ago', () => {
      [1, 2, 4, 7].forEach(lookbackNum => {
        expect(nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}h`, now)).toBe(
          lookbackNum * hourInMicroseconds
        );
      });
    });

    it('creates timestamp for days ago', () => {
      [1, 2, 4, 7].forEach(lookbackNum => {
        const actual = nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}d`, now);
        const expected = lookbackNum * 24 * hourInMicroseconds;
        try {
          expect(actual).toBe(expected);
        } catch (_e) {
          expect(Math.abs(actual - expected)).toBe(hourInMicroseconds);
        }
      });
    });

    it('creates timestamp for weeks ago', () => {
      [1, 2, 4, 7].forEach(lookbackNum => {
        const actual = nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}w`, now);
        try {
          expect(actual).toBe(lookbackNum * 7 * 24 * hourInMicroseconds);
        } catch (_e) {
          expect(Math.abs(actual - lookbackNum * 7 * 24 * hourInMicroseconds)).toBe(hourInMicroseconds);
        }
      });
    });
  });

  describe('optionsWithinMaxLookback', () => {
    const threeHoursOfExpectedOptions = [
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
    ];

    it('memoizes correctly', () => {
      const firstCallOptions = optionsWithinMaxLookback(threeHoursOfExpectedOptions[0]);
      const secondCallOptions = optionsWithinMaxLookback(threeHoursOfExpectedOptions[0]);
      const thirdCallOptions = optionsWithinMaxLookback(threeHoursOfExpectedOptions[1]);
      expect(secondCallOptions).toBe(firstCallOptions);
      expect(thirdCallOptions).not.toBe(firstCallOptions);
    });

    it('returns options within config.search.maxLookback', () => {
      const configValue = threeHoursOfExpectedOptions[threeHoursOfExpectedOptions.length - 1];
      const options = optionsWithinMaxLookback(configValue);

      expect(options.length).toBe(threeHoursOfExpectedOptions.length);
      options.forEach(({ props }, i) => {
        expect(props.value).toBe(threeHoursOfExpectedOptions[i].value);
        expect(props.children).toBe(`Last ${threeHoursOfExpectedOptions[i].label}`);
      });
    });

    it("includes config.search.maxLookback if it's not part of standard options", () => {
      const configValue = {
        label: '4 Hours - configValue',
        value: '4h',
      };
      const expectedOptions = [...threeHoursOfExpectedOptions, configValue];
      const options = optionsWithinMaxLookback(configValue);

      expect(options.length).toBe(expectedOptions.length);
      options.forEach(({ props }, i) => {
        expect(props.value).toBe(expectedOptions[i].value);
        expect(props.children).toBe(`Last ${expectedOptions[i].label}`);
      });
    });

    it('uses config.search.maxLookback in place of standard option it is not equal to but is equivalent to', () => {
      const configValue = {
        label: '180 minutes is equivalent to 3 hours',
        value: '180m',
      };

      const expectedOptions = [...threeHoursOfExpectedOptions.slice(0, -1), configValue];
      const options = optionsWithinMaxLookback(configValue);

      expect(options.length).toBe(expectedOptions.length);
      options.forEach(({ props }, i) => {
        expect(props.value).toBe(expectedOptions[i].value);
        expect(props.children).toBe(`Last ${expectedOptions[i].label}`);
      });
    });
  });
});

describe('submitForm()', () => {
  const LOOKBACK_VALUE = 2;
  const LOOKBACK_UNIT = 's';
  let searchTraces;
  let fields;

  beforeEach(() => {
    searchTraces = jest.fn();
    fields = {
      lookback: `${LOOKBACK_VALUE}${LOOKBACK_UNIT}`,
      operation: 'op-a',
      resultsLimit: 20,
      service: 'svc-a',
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

  it('expects operation to be value defined in beforeEach', () => {
    submitForm(fields, searchTraces);
    const { calls } = searchTraces.mock;
    expect(calls.length).toBe(1);
    const { operation } = calls[0][0];
    expect(operation).toBe('op-a');
  });

  it('expects operation to be value assigned before call is made', () => {
    fields.operation = 'test';
    submitForm(fields, searchTraces);
    const { calls } = searchTraces.mock;
    expect(calls.length).toBe(1);
    const { operation } = calls[0][0];
    expect(operation).toBe('test');
  });

  describe('`fields.lookback`', () => {
    function getCalledDuration(mock) {
      const { start, end } = mock.calls[0][0];
      const diffMs = (Number(end) - Number(start)) / 1000;
      return dayjs.duration(diffMs);
    }

    it('subtracts `lookback` from `fields.end`', () => {
      submitForm(fields, searchTraces);
      expect(searchTraces).toHaveBeenCalledTimes(1);
      expect(getCalledDuration(searchTraces.mock).asSeconds()).toBe(LOOKBACK_VALUE);
    });

    it('parses `lookback` double digit options', () => {
      const lookbackDoubleDigitValue = 12;
      fields.lookback = `${lookbackDoubleDigitValue}h`;
      submitForm(fields, searchTraces);
      expect(searchTraces).toHaveBeenCalledTimes(1);
      expect(getCalledDuration(searchTraces.mock).asHours()).toBe(lookbackDoubleDigitValue);
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

  describe('`fields.tags`', () => {
    it('is ignored when `fields.tags` is falsy', () => {
      fields.tags = undefined;
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { tag } = calls[0][0];
      expect(tag).toBe(undefined);
    });

    it('is parsed when `fields.tags` is truthy', () => {
      const input = 'http.status_code=404 span.kind=client key="with a long value"';
      const target = JSON.stringify({
        'http.status_code': '404',
        'span.kind': 'client',
        key: 'with a long value',
      });
      fields.tags = input;
      submitForm(fields, searchTraces);
      const { calls } = searchTraces.mock;
      expect(calls.length).toBe(1);
      const { tags } = calls[0][0];
      expect(tags).toEqual(target);
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

describe('<SearchForm>', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<SearchForm {...defaultProps} />);
  });

  it('enables operations only when a service is selected', () => {
    let ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(true);
    wrapper.instance().handleChange({ service: 'svcA' });
    ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(false);
  });

  it('keeps operation disabled when no service selected', () => {
    let ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(true);
    wrapper.instance().handleChange({ service: '' });
    ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(true);
  });

  it('enables operation when unknown service selected', () => {
    let ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(true);
    wrapper.instance().handleChange({ service: 'svcC' });
    ops = wrapper.find('[placeholder="Select An Operation"]');
    expect(ops.prop('disabled')).toBe(false);
  });

  it('shows custom date inputs when `props.selectedLookback` is "custom"', () => {
    function getDateFieldLengths(compWrapper) {
      return [
        compWrapper.find('[placeholder="Start Date"]').length,
        compWrapper.find('[placeholder="End Date"]').length,
      ];
    }
    expect(getDateFieldLengths(wrapper)).toEqual([0, 0]);
    wrapper = shallow(<SearchForm {...defaultProps} />);
    wrapper.instance().handleChange({ lookback: 'custom' });
    expect(getDateFieldLengths(wrapper)).toEqual([1, 1]);
  });

  it('disables the submit button when a service is not selected', () => {
    let btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(btn.prop('disabled')).toBeTruthy();
    wrapper = shallow(<SearchForm {...defaultProps} />);
    wrapper.instance().handleChange({ service: 'svcA' });
    btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(btn.prop('disabled')).toBeFalsy();
  });

  it('disables the submit button when the form has invalid data', () => {
    wrapper = shallow(<SearchForm {...defaultProps} />);
    wrapper.instance().handleChange({ service: 'svcA' });
    let btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    // If this test fails on the following expect statement, this may be a false negative caused by a separate
    // regression.
    expect(btn.prop('disabled')).toBeFalsy();
    wrapper.setProps({ invalid: true });
    btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(btn.prop('disabled')).toBeTruthy();
  });

  it('disables the submit button when duration is invalid', () => {
    wrapper = shallow(<SearchForm {...defaultProps} />);
    wrapper.instance().handleChange({ service: 'svcA' });
    wrapper.instance().handleChange({ minDuration: '1ms' });
    let btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    let invalidDuration =
      validateDurationFields(wrapper.state().formData.minDuration) ||
      validateDurationFields(wrapper.state().formData.maxDuration);
    expect(invalidDuration).not.toBeDefined();
    expect(btn.prop('disabled')).toBeFalsy();

    wrapper.instance().handleChange({ minDuration: '1kg' });
    btn = wrapper.find(`[data-test="${markers.SUBMIT_BTN}"]`);
    invalidDuration =
      validateDurationFields(wrapper.state().formData.minDuration) ||
      validateDurationFields(wrapper.state().formData.maxDuration);
    expect(invalidDuration).toBeDefined();
    expect(btn.prop('disabled')).toBeTruthy();
  });

  it('uses config.search.maxLimit', () => {
    const maxLimit = 6789;
    getConfig.apply({}, []);
    const config = {
      search: {
        maxLimit,
      },
    };
    window.getJaegerUiConfig = jest.fn(() => config);
    wrapper = shallow(<SearchForm {...defaultProps} />);
    wrapper.instance().handleChange({ service: 'svcA' });
    const field = wrapper.find(`Input[name="resultsLimit"]`);
    expect(field.prop('max')).toEqual(maxLimit);
  });

  it('updates state when tags input changes', () => {
    const tagsInput = wrapper.find('Input[name="tags"]');
    tagsInput.simulate('change', { target: { value: 'new=tag' } });
    expect(wrapper.state('formData').tags).toBe('new=tag');
  });

  it('updates state when service input changes', () => {
    const serviceInput = wrapper.find('SearchableSelect[name="service"]');
    serviceInput.simulate('change', 'svcA');
    expect(wrapper.state('formData').service).toBe('svcA');
  });

  it('updates state when operation input changes', () => {
    const operationInput = wrapper.find('SearchableSelect[name="operation"]');
    operationInput.simulate('change', 'A');
    expect(wrapper.state('formData').operation).toBe('A');
  });

  it('updates state when lookback input changes', () => {
    const lookbackInput = wrapper.find('SearchableSelect[name="lookback"]');
    lookbackInput.simulate('change', 'new-lookback');
    expect(wrapper.state('formData').lookback).toBe('new-lookback');
  });

  it('updates state when date and time fields input changes', () => {
    const lookbackInput = wrapper.find('SearchableSelect[name="lookback"]');
    lookbackInput.simulate('change', 'custom');
    expect(wrapper.state('formData').lookback).toBe('custom');

    const startDateInput = wrapper.find('Input[name="startDate"]');
    startDateInput.simulate('change', { target: { value: 'new-date' } });
    expect(wrapper.state('formData').startDate).toBe('new-date');

    const startDateTimeInput = wrapper.find('Input[name="startDateTime"]');
    startDateTimeInput.simulate('change', { target: { value: 'new-time' } });
    expect(wrapper.state('formData').startDateTime).toBe('new-time');

    const endDateInput = wrapper.find('Input[name="endDate"]');
    endDateInput.simulate('change', { target: { value: 'new-date' } });
    expect(wrapper.state('formData').endDate).toBe('new-date');

    const endDateTimeInput = wrapper.find('Input[name="endDateTime"]');
    endDateTimeInput.simulate('change', { target: { value: 'new-time' } });
    expect(wrapper.state('formData').endDateTime).toBe('new-time');
  });

  it('updates state when minDuration input changes', () => {
    const minDurationInput = wrapper.find('ValidatedFormField[name="minDuration"]');
    minDurationInput.simulate('change', { target: { value: 'new-minDuration' } });
    expect(wrapper.state('formData').minDuration).toBe('new-minDuration');
  });

  it('updates state when maxDuration input changes', () => {
    const maxDurationInput = wrapper.find('ValidatedFormField[name="maxDuration"]');
    maxDurationInput.simulate('change', { target: { value: 'new-maxDuration' } });
    expect(wrapper.state('formData').maxDuration).toBe('new-maxDuration');
  });

  it('updates state when resultsLimit input changes', () => {
    const resultsLimitInput = wrapper.find('Input[name="resultsLimit"]');
    resultsLimitInput.simulate('change', { target: { value: 'new-resultsLimit' } });
    expect(wrapper.state('formData').resultsLimit).toBe('new-resultsLimit');
  });
});

describe('submitFormHandler', () => {
  let wrapper;
  let submitFormHandler;
  let preventDefault;

  beforeEach(() => {
    submitFormHandler = sinon.spy();
    preventDefault = sinon.spy();
    wrapper = shallow(
      <SearchForm
        {...defaultProps}
        submitFormHandler={submitFormHandler}
        initialValues={{ service: 'svcA' }}
      />
    );
  });

  it('calls submitFormHandler with formData on form submit', () => {
    const formData = wrapper.state('formData');
    wrapper.instance().handleSubmit({ preventDefault });
    expect(preventDefault.calledOnce).toBe(true);
    expect(submitFormHandler.calledOnceWith(formData)).toBe(true);
  });

  it('prevents default form submission behavior', () => {
    wrapper.instance().handleSubmit({ preventDefault });
    expect(preventDefault.calledOnce).toBe(true);
  });
});

describe('validation', () => {
  it('should return `undefined` if the value is falsy', () => {
    expect(validateDurationFields('')).toBeUndefined();
    expect(validateDurationFields(null)).toBeUndefined();
    expect(validateDurationFields(undefined)).toBeUndefined();
  });

  it('should return Popover-compliant error object if the value is a populated string that does not adhere to expected format', () => {
    expect(validateDurationFields('100')).toEqual({
      content: 'Please enter a number followed by a duration unit, e.g. 1.2s, 100ms, 500us',
      title: 'Please match the requested format.',
    });
  });

  it('should return `undefined` if the value is a populated string that adheres to expected format', () => {
    expect(validateDurationFields('100ms')).toBeUndefined();
  });
});

describe('mapStateToProps()', () => {
  let state;

  beforeEach(() => {
    state = { router: { location: { search: '' } } };
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

  describe('deriving values from `state.router.location.search`', () => {
    let params;
    let expected;

    beforeEach(() => {
      const { date: startSrc, dateStr: startDate, dateTimeStr: startDateTime } = makeDateParams(-1);
      const { date: endSrc, dateStr: endDate, dateTimeStr: endDateTime } = makeDateParams(0);
      const tagsJSON = '{"error":"true","span.kind":"client"}';
      const tagsLogfmt = 'error=true span.kind=client';
      const common = {
        lookback: '2h',
        maxDuration: null,
        minDuration: null,
        operation: 'Driver::findNearest',
        service: 'driver',
      };
      params = {
        ...common,
        end: `${endSrc.valueOf()}000`,
        limit: '999',
        start: `${startSrc.valueOf()}000`,
        tags: tagsJSON,
      };
      expected = {
        ...common,
        endDate,
        endDateTime,
        startDate,
        startDateTime,
        resultsLimit: params.limit,
        tags: tagsLogfmt,
        traceIDs: null,
      };
    });

    it('derives values when available', () => {
      state.router.location.search = queryString.stringify(params);
      expect(mapStateToProps(state).initialValues).toEqual(expected);
    });

    it('parses `tag` values in the former format to logfmt', () => {
      delete params.tags;
      params.tag = ['error:true', 'span.kind:client'];
      state.router.location.search = queryString.stringify(params);
      expect(mapStateToProps(state).initialValues).toEqual(expected);
    });
  });

  it('fallsback to default values', () => {
    // convert time string to number of minutes in day
    function msDiff(aDate, aTime, bDate, bTime) {
      const a = new Date(`${aDate}T${aTime}`);
      const b = new Date(`${bDate}T${bTime}`);
      return Math.abs(a - b);
    }
    const dateParams = makeDateParams(0);
    const { startDate, startDateTime, endDate, endDateTime, ...values } =
      mapStateToProps(state).initialValues;

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

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      changeServiceHandler: expect.any(Function),
      submitFormHandler: expect.any(Function),
    });
  });

  it('should dispatch changeServiceHandler correctly', () => {
    const dispatch = jest.fn();
    const { changeServiceHandler } = mapDispatchToProps(dispatch);
    const service = 'test-service';

    changeServiceHandler(service);

    expect(dispatch).toHaveBeenCalledWith({
      type: CHANGE_SERVICE_ACTION_TYPE,
      payload: service,
    });
  });

  it('should dispatch submitFormHandler correctly', () => {
    const dispatch = jest.fn();
    const searchTraces = jest.fn();
    const fields = {
      lookback: '1ms',
      operation: 'A',
      resultsLimit: 20,
      service: 'svcA',
    };

    jest.spyOn(jaegerApiActions, 'searchTraces').mockReturnValue(searchTraces);
    const { submitFormHandler } = mapDispatchToProps(dispatch);
    submitFormHandler(fields);
    expect(dispatch).toHaveBeenCalledWith(expect.any(Function));
  });
});
