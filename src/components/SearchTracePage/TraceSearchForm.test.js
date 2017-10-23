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
