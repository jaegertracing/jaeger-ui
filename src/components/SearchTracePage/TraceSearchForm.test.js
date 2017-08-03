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

import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';

const {
  TraceSearchFormComponent: TraceSearchForm,
  getUnixTimeStampInMSFromForm,
  convertQueryParamsToFormDates,
} = require('./TraceSearchForm');

const defaultProps = {
  services: [{ name: 'svcA', operations: ['A', 'B'] }, { name: 'svcB', operations: ['A', 'B'] }],
  dataCenters: ['dc1'],
};

it('<TraceSearchForm /> only shows operations when a service is selected', () => {
  let wrapper;
  wrapper = shallow(<TraceSearchForm {...defaultProps} selectedService="svcA" />);
  expect(wrapper.find('.search-form--operation').length).toBe(1);

  wrapper = shallow(<TraceSearchForm {...defaultProps} />);
  expect(wrapper.find('.search-form--operation').length).toBe(0);
});

it('getUnixTimeStampInMSFromForm converts correctly.', () => {
  const startMoment = moment().subtract(1, 'day');
  const endMoment = moment();
  const params = {
    startDate: startMoment.format(DATE_FORMAT),
    startDateTime: startMoment.format(TIME_FORMAT),
    endDate: endMoment.format(DATE_FORMAT),
    endDateTime: endMoment.format(TIME_FORMAT),
  };

  const { start, end } = getUnixTimeStampInMSFromForm(params);
  expect(start).toBe(`${startMoment.seconds(0).unix()}000000`);
  expect(end).toBe(`${endMoment.seconds(0).unix()}000000`);
});

it('convertQueryParamsToFormDates converts correctly.', () => {
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
