// Copyright (c) 2020 The Jaeger Authors.
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

import MainTableData from './MainTableData';

describe('<MainTableData>', () => {
  let wrapper;
  let props;

  beforeEach(() => {
    props = {
      color: '#17B8BE',
      columnsArray: [
        { title: 'Name', attribute: 'name', suffix: '', isDecimal: false },
        { title: 'Count', attribute: 'count', suffix: '', isDecimal: false },
        { title: 'Total', attribute: 'total', suffix: 'ms', isDecimal: true },
        { title: 'Avg', attribute: 'avg', suffix: 'ms', isDecimal: true },
        { title: 'Min', attribute: 'min', suffix: 'ms', isDecimal: true },
        { title: 'Max', attribute: 'max', suffix: 'ms', isDecimal: true },
        { title: 'ST Total', attribute: 'selfTotal', suffix: 'ms', isDecimal: true },
        { title: 'ST Avg', attribute: 'selfAvg', suffix: 'ms', isDecimal: true },
        { title: 'ST Min', attribute: 'selfMin', suffix: 'ms', isDecimal: true },
        { title: 'ST Max', attribute: 'selfMax', suffix: 'ms', isDecimal: true },
        { title: 'ST in Duration', attribute: 'percent', suffix: '%', isDecimal: true },
      ],
      valueNameSelector1: 'Service Name',
      valueNameSelector2: null,
      name: 'api-gateway',
      searchColor: 'transparent',
      togglePopup: '',
      values: [5, 46.06, 9.21, 2.56, 15.43, 11.21, 2.24, 0.82, 5.06, 24.35],
    };
    wrapper = shallow(<MainTableData {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.MainTableData--tr').length).toBe(1);
    expect(wrapper.find('.MainTableData--td').length).toBe(11);
  });

  it('renders TableOverviewHeadTag', () => {
    expect(wrapper.find('.MainTableData--label').text()).toBe('api-gateway');

    const firstRowColumns = wrapper.find('.MainTableData--td').map(column => column.text());
    expect(firstRowColumns.length).toBe(11);

    expect(firstRowColumns[0]).toBe('api-gateway');
    expect(firstRowColumns[1]).toBe(' 5');
    expect(firstRowColumns[2]).toBe(' 46.06ms');
    expect(firstRowColumns[3]).toBe(' 9.21ms');
    expect(firstRowColumns[4]).toBe(' 2.56ms');
    expect(firstRowColumns[5]).toBe(' 15.43ms');
    expect(firstRowColumns[6]).toBe(' 11.21ms');
    expect(firstRowColumns[7]).toBe(' 2.24ms');
    expect(firstRowColumns[8]).toBe(' 0.82ms');
    expect(firstRowColumns[9]).toBe(' 5.06ms');
    expect(firstRowColumns[10]).toBe(' 24.35%');
  });
});
