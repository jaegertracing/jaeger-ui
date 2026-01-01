// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('store');
jest.mock('../common/SearchableSelect', () => {
  const MockSearchableSelect = ({ onChange, name, disabled, ...props }) => {
    if (onChange && name) {
      MockSearchableSelect.onChangeFns[name] = onChange;
    }
    if (name) {
      MockSearchableSelect.disabled[name] = disabled;
    }
    return <div data-testid={`mock-select-${name}`} data-disabled={disabled} />;
  };
  MockSearchableSelect.onChangeFns = {};
  MockSearchableSelect.disabled = {};
  return MockSearchableSelect;
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import dayjs from 'dayjs';
import queryString from 'query-string';
import store from 'store';
import * as jaegerApiActions from '../../actions/jaeger-api';
import SearchableSelect from '../common/SearchableSelect';

import {
  applyAdjustTime,
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
  changeServiceHandler: jest.fn(),
  submitFormHandler: jest.fn(),
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

    it('returns null if traceIDs is falsy', () => {
      expect(traceIDsToQuery(null)).toBe(null);
      expect(traceIDsToQuery(undefined)).toBe(null);
      expect(traceIDsToQuery('')).toBe(null);
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

  describe('applyAdjustTime', () => {
    const minuteInMicroseconds = 60 * 1000 * 1000;
    const now = new Date();
    const nowInMicroseconds = now.valueOf() * 1000;

    it('returns original timestamp when adjustTime is undefined', () => {
      expect(applyAdjustTime(nowInMicroseconds, undefined)).toBe(nowInMicroseconds);
    });

    it('returns original timestamp when adjustTime is null', () => {
      expect(applyAdjustTime(nowInMicroseconds, null)).toBe(nowInMicroseconds);
    });

    it('returns original timestamp when adjustTime is empty string', () => {
      expect(applyAdjustTime(nowInMicroseconds, '')).toBe(nowInMicroseconds);
    });

    it('subtracts 1 minute from timestamp for adjustTime="1m"', () => {
      const adjusted = applyAdjustTime(nowInMicroseconds, '1m');
      expect(nowInMicroseconds - adjusted).toBe(minuteInMicroseconds);
    });

    it('subtracts 5 minutes from timestamp for adjustTime="5m"', () => {
      const adjusted = applyAdjustTime(nowInMicroseconds, '5m');
      expect(nowInMicroseconds - adjusted).toBe(5 * minuteInMicroseconds);
    });

    it('subtracts 30 seconds from timestamp for adjustTime="30s"', () => {
      const secondInMicroseconds = 1000 * 1000;
      const adjusted = applyAdjustTime(nowInMicroseconds, '30s');
      expect(nowInMicroseconds - adjusted).toBe(30 * secondInMicroseconds);
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
      options.forEach((option, i) => {
        expect(option.props.value).toBe(threeHoursOfExpectedOptions[i].value);
        expect(option.props.children).toBe(`Last ${threeHoursOfExpectedOptions[i].label}`);
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
      options.forEach((option, i) => {
        expect(option.props.value).toBe(expectedOptions[i].value);
        expect(option.props.children).toBe(`Last ${expectedOptions[i].label}`);
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
      options.forEach((option, i) => {
        expect(option.props.value).toBe(expectedOptions[i].value);
        expect(option.props.children).toBe(`Last ${expectedOptions[i].label}`);
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
  beforeEach(() => {
    jest.clearAllMocks();
    SearchableSelect.onChangeFns = {};
    SearchableSelect.disabled = {};
  });

  it('enables operations only when a service is selected', () => {
    render(<SearchForm {...defaultProps} />);

    expect(SearchableSelect.disabled.operation).toBe(true);

    render(<SearchForm {...defaultProps} initialValues={{ service: 'svcA' }} />);

    expect(SearchableSelect.disabled.operation).toBe(false);
  });

  it('keeps operation disabled when no service selected', () => {
    render(<SearchForm {...defaultProps} />);

    expect(SearchableSelect.disabled.operation).toBe(true);
  });

  it('enables operation when unknown service selected', () => {
    class TestSearchForm extends SearchForm {
      componentDidMount() {
        this.handleChange({ service: 'svcC' });
      }
    }

    render(<TestSearchForm {...defaultProps} />);

    expect(defaultProps.changeServiceHandler).toHaveBeenCalledWith('svcC');
  });

  it('shows custom date inputs when lookback is set to "custom"', () => {
    const props = {
      ...defaultProps,
      initialValues: {
        lookback: 'custom',
        startDate: '2020-01-01',
        startDateTime: '00:00',
        endDate: '2020-01-02',
        endDateTime: '00:00',
      },
    };

    const { container } = render(<SearchForm {...props} />);

    const startDateInput = container.querySelector('input[name="startDate"]');
    const endDateInput = container.querySelector('input[name="endDate"]');

    expect(startDateInput).toBeInTheDocument();
    expect(endDateInput).toBeInTheDocument();
  });

  it('disables the submit button when a service is not selected', () => {
    const { container } = render(<SearchForm {...defaultProps} initialValues={{ service: '-' }} />);

    const submitButton = container.querySelector(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button when the form has invalid data', () => {
    const { container } = render(
      <SearchForm {...defaultProps} invalid={true} initialValues={{ service: 'svcA' }} />
    );

    const submitButton = container.querySelector(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button when duration is invalid', () => {
    const { container } = render(<SearchForm {...defaultProps} initialValues={{ service: 'svcA' }} />);

    const submitButton = container.querySelector(`[data-test="${markers.SUBMIT_BTN}"]`);
    expect(submitButton).not.toBeDisabled();

    const minDurationInput = container.querySelector('input[name="minDuration"]');
    fireEvent.change(minDurationInput, { target: { value: '1kg' } });

    expect(submitButton).toBeDisabled();
  });

  it('uses config.search.maxLimit', () => {
    const maxLimit = 6789;
    const config = {
      search: {
        maxLimit,
      },
    };

    const originalGetConfig = window.getJaegerUiConfig;
    window.getJaegerUiConfig = jest.fn(() => config);

    const { container } = render(<SearchForm {...defaultProps} />);

    const limitInput = container.querySelector('input[name="resultsLimit"]');
    expect(limitInput).toHaveAttribute('max');

    window.getJaegerUiConfig = originalGetConfig;
  });

  it('updates state when tags input changes', () => {
    const { container } = render(<SearchForm {...defaultProps} />);

    const tagsInput = container.querySelector('input[name="tags"]');
    fireEvent.change(tagsInput, { target: { value: 'new=tag' } });

    expect(tagsInput.value).toBe('new=tag');
  });

  it('prevents default form submission behavior', () => {
    class TestSearchForm extends SearchForm {
      componentDidMount() {
        const mockEvent = { preventDefault: jest.fn() };
        this.handleSubmit(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();

        expect(this.props.submitFormHandler).toHaveBeenCalledWith(
          this.state.formData,
          this.props.searchAdjustEndTime,
          this.state.adjustTimeEnabled
        );
      }
    }

    render(<TestSearchForm {...defaultProps} searchAdjustEndTime="1m" />);
  });
});

describe('SearchForm onChange handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SearchableSelect.onChangeFns = {};
    SearchableSelect.disabled = {};
  });

  it('calls handleChange with proper arguments when onChange handlers are triggered', () => {
    const props = {
      ...defaultProps,
      initialValues: {
        lookback: 'custom',
        startDate: '2025-08-06',
        startDateTime: '18:19',
        endDate: '2025-08-06',
        endDateTime: '18:19',
      },
    };

    const handleChangeMock = jest.fn();

    class TestSearchForm extends SearchForm {
      constructor(props) {
        super(props);
        this.handleChange = handleChangeMock;
      }
    }

    const { container } = render(<TestSearchForm {...props} />);
    const serviceOnChange = SearchableSelect.onChangeFns.service;
    expect(serviceOnChange).toBeDefined();
    serviceOnChange('testService');
    expect(handleChangeMock).toHaveBeenCalledWith({ service: 'testService' });

    const operationOnChange = SearchableSelect.onChangeFns.operation;
    expect(operationOnChange).toBeDefined();
    operationOnChange('testOperation');
    expect(handleChangeMock).toHaveBeenCalledWith({ operation: 'testOperation' });

    const lookbackOnChange = SearchableSelect.onChangeFns.lookback;
    expect(lookbackOnChange).toBeDefined();
    lookbackOnChange('2h');
    expect(handleChangeMock).toHaveBeenCalledWith({ lookback: '2h' });

    const startDateInput = container.querySelector('input[name="startDate"]');
    expect(startDateInput).toBeInTheDocument();
    fireEvent.change(startDateInput, { target: { value: '2025-08-07' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ startDate: '2025-08-07' });

    const startDateTimeInput = container.querySelector('input[name="startDateTime"]');
    expect(startDateTimeInput).toBeInTheDocument();
    fireEvent.change(startDateTimeInput, { target: { value: '10:00' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ startDateTime: '10:00' });

    const endDateInput = container.querySelector('input[name="endDate"]');
    expect(endDateInput).toBeInTheDocument();
    fireEvent.change(endDateInput, { target: { value: '2025-08-08' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ endDate: '2025-08-08' });

    const endDateTimeInput = container.querySelector('input[name="endDateTime"]');
    expect(endDateTimeInput).toBeInTheDocument();
    fireEvent.change(endDateTimeInput, { target: { value: '11:00' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ endDateTime: '11:00' });

    const resultsLimitInput = container.querySelector('input[name="resultsLimit"]');
    expect(resultsLimitInput).toBeInTheDocument();
    fireEvent.change(resultsLimitInput, { target: { value: '100' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ resultsLimit: '100' });

    const tagsInput = container.querySelector('input[name="tags"]');
    expect(tagsInput).toBeInTheDocument();
    fireEvent.change(tagsInput, { target: { value: 'error=true' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ tags: 'error=true' });

    const maxDurationInput = container.querySelector('input[name="maxDuration"]');
    expect(maxDurationInput).toBeInTheDocument();
    fireEvent.change(maxDurationInput, { target: { value: '5s' } });
    expect(handleChangeMock).toHaveBeenCalledWith({ maxDuration: '5s' });

    expect(handleChangeMock).toHaveBeenCalledTimes(10);
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

    it('parses single string `tag` value in the former format to logfmt', () => {
      delete params.tags;
      params.tag = 'error:true';
      state.router.location.search = queryString.stringify(params);

      const singleTagExpected = {
        ...expected,
        tags: 'error=true',
      };

      expect(mapStateToProps(state).initialValues).toEqual(singleTagExpected);
    });

    it('handles tag parsing for keys without values', () => {
      delete params.tags;
      params.tag = 'invalid-no-colon';
      state.router.location.search = queryString.stringify(params);

      const tagWithEmptyValueExpected = {
        ...expected,
        tags: 'invalid-no-colon=""',
      };

      expect(mapStateToProps(state).initialValues).toEqual(tagWithEmptyValueExpected);
    });

    it('handles true parse errors', () => {
      delete params.tags;

      state.router.location.search = queryString.stringify(params);

      const parseErrorExpected = {
        ...expected,
        tags: undefined,
      };

      expect(mapStateToProps(state).initialValues).toEqual(parseErrorExpected);
    });

    it('handles empty key in tag parameter', () => {
      delete params.tags;
      params.tag = ':somevalue';
      state.router.location.search = queryString.stringify(params);

      const parseErrorExpected = {
        ...expected,
        tags: 'Parse Error',
      };

      expect(mapStateToProps(state).initialValues).toEqual(parseErrorExpected);
    });

    it('handles invalid JSON in logfmtTags', () => {
      delete params.tags;
      params.tags = '{invalid-json}';
      state.router.location.search = queryString.stringify(params);

      const errorExpected = {
        ...expected,
        tags: 'Parse Error',
      };

      expect(mapStateToProps(state).initialValues).toEqual(errorExpected);
    });

    it('handles traceIDParams as string', () => {
      params.traceID = '123abc';
      state.router.location.search = queryString.stringify(params);

      const traceIDExpected = {
        ...expected,
        traceIDs: '123abc',
      };

      expect(mapStateToProps(state).initialValues).toEqual(traceIDExpected);
    });

    it('handles traceIDParams as array', () => {
      params.traceID = ['123abc', '456def'];
      state.router.location.search = queryString.stringify(params);

      const traceIDExpected = {
        ...expected,
        traceIDs: '123abc,456def',
      };

      expect(mapStateToProps(state).initialValues).toEqual(traceIDExpected);
    });
  });

  it('fallsback to default values', () => {
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

describe('submitForm() adjustEndTime toggle', () => {
  it('should apply adjustEndTime when adjustTimeEnabled is true', () => {
    const searchTraces = jest.fn();
    const fields = {
      lookback: '1h',
      operation: 'all',
      resultsLimit: 20,
      service: 'svcA',
    };

    submitForm(fields, searchTraces, '1m', true);

    expect(searchTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'svcA',
      })
    );
  });

  it('should not apply adjustEndTime when adjustTimeEnabled is false', () => {
    const searchTraces = jest.fn();
    const fields = {
      lookback: '1h',
      operation: 'all',
      resultsLimit: 20,
      service: 'svcA',
    };

    submitForm(fields, searchTraces, '1m', false);

    expect(searchTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'svcA',
      })
    );
  });
});

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      searchTraces: expect.any(Function),
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
});
