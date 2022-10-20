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
import DetailTableData from './DetailTableData';

describe('<DetailTableData>', () => {
  let wrapper;
  let props;

  beforeEach(() => {
    props = {
      color: '',
      colorToPercent: 'rgb(248,248,248)',
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
      name: 'GET /owners/5',
      searchColor: 'rgb(248,248,248)',
      valueNameSelector2: 'Operation Name',
      togglePopup: () => {},
      values: [3, 27.27, 9.09, 2.56, 13.73, 8.69, 2.9, 0.88, 5.06, 31.88],
    };
    wrapper = shallow(<DetailTableData {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.DetailTableData--tr').length).toBe(1);
    expect(wrapper.find('.DetailTableData--td').length).toBe(11);
  });

  it('renders TableOverviewHeadTag', () => {
    const firstRowColumns = wrapper.find('.DetailTableData--td').map(column => column.text());
    expect(firstRowColumns.length).toBe(11);

    expect(firstRowColumns[0]).toBe('GET /owners/5');
    expect(firstRowColumns[1]).toBe('3');
    expect(firstRowColumns[2]).toBe('27.27ms');
    expect(firstRowColumns[3]).toBe('9.09ms');
    expect(firstRowColumns[4]).toBe('2.56ms');
    expect(firstRowColumns[5]).toBe('13.73ms');
    expect(firstRowColumns[6]).toBe('8.69ms');
    expect(firstRowColumns[7]).toBe('2.90ms');
    expect(firstRowColumns[8]).toBe('0.88ms');
    expect(firstRowColumns[9]).toBe('5.06ms');
    expect(firstRowColumns[10]).toBe('31.88%');
    expect(wrapper.find('.DetailTableData--tr').prop('style')).toEqual({
      background: 'rgb(248,248,248)',
      borderColor: 'rgb(248,248,248)',
    });
  });
});
