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
import { mount } from 'enzyme';
import TraceStatistics from './index';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import PopupSql from './PopupSql';
import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

import testTrace from './tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace);

describe('<TraceTagOverview>', () => {
  let wrapper;
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      trace: transformedTrace,
      uiFind: undefined,
      uiFindVertexKeys: undefined,
    };

    wrapper = mount(<TraceStatistics {...defaultProps} />);
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
  });

  it('renders Trace Tag Overview', () => {
    expect(wrapper.find(TraceStatisticsHeader).length).toBe(1);
    expect(wrapper.state('valueNameSelector1')).toBe('Service Name');
    expect(wrapper.state('valueNameSelector2')).toBe(null);
    expect(wrapper.find(PopupSql).length).toBe(0);
  });

  it('check search', () => {
    const searchSet = new Set();
    searchSet.add('service1	op1	__LEAF__');

    wrapper.setProps({ uiFind: 'service1', uiFindVertexKeys: searchSet });
    expect(wrapper.state('tableValue')[0].searchColor).toBe('rgb(255,243,215)');

    wrapper.setProps({ uiFind: undefined, uiFindVertexKeys: undefined });
    expect(wrapper.state('tableValue')[0].searchColor).toBe('transparent');
  });

  it('check handler', () => {
    let tableValue = getColumnValues('Service Name', transformedTrace);
    tableValue = getColumnValuesSecondDropdown(
      tableValue,
      'Service Name',
      'Operation Name',
      transformedTrace
    );
    const instance = wrapper.instance();
    instance.handler(tableValue, tableValue, 'Service Name', 'Operation Name');

    // table is sorted only after calling handler
    expect(wrapper.state('tableValue')[2].count).toBe(2);
    expect(wrapper.state('tableValue')[2].parentElement).toBe('service1');
    expect(tableValue[6].count).toBe(2);
    expect(tableValue[6].parentElement).toBe('service1');
  });

  it('check togglePopup', () => {
    const instance = wrapper.instance();
    instance.togglePopup('select *');

    expect(instance.state.popupContent).toBe('select *');
    expect(instance.state.showPopup).toBe(true);

    instance.togglePopup('select *');
    expect(instance.state.popupContent).toBe('select *');
    expect(instance.state.showPopup).toBe(false);
  });

  it('should trigger onClickOption when clicking on name cell with sql.query selector', () => {
    const instance = wrapper.instance();
    instance.setState({ valueNameSelector1: 'sql.query' });
    
    const mockTableData = [
      {
        name: 'SELECT * FROM users',
        hasSubgroupValue: true,
        searchColor: 'transparent',
        key: '0'
      }
    ];
    
    instance.setState({ tableValue: mockTableData });
    wrapper.update();
    
    const nameCell = wrapper.find('[role="button"]').first();
    nameCell.simulate('click');
    
    expect(wrapper.state('showPopup')).toBe(true);
    expect(wrapper.state('popupContent')).toBe('SELECT * FROM users');
  });

  it('should handle onClickOption when hasSubgroupValue is false', () => {
    const instance = wrapper.instance();
    instance.setState({ valueNameSelector1: 'sql.query' });
    
    const mockTableData = [
      {
        name: 'test-name',
        hasSubgroupValue: false,
        searchColor: 'transparent',
        key: '0'
      }
    ];
    
    instance.setState({ tableValue: mockTableData });
    wrapper.update();
    
    const nameCell = wrapper.find('[role="button"]').first();
    nameCell.simulate('click');
    
    expect(wrapper.state('showPopup')).toBe(false);
  });

  it('should test sorter function with string comparison', () => {
    const instance = wrapper.instance();
    const mockTableData = [
      {
        name: 'zebra',
        hasSubgroupValue: true,
        count: 1,
        key: '0'
      },
      {
        name: 'alpha',
        hasSubgroupValue: true,
        count: 2,
        key: '1'
      }
    ];
    
    instance.setState({ tableValue: mockTableData });
    wrapper.update();
    
    const nameColumnHeader = wrapper.find('.ant-table-column-sorters').first();
    nameColumnHeader.simulate('click');
    
    wrapper.update();
  });

  it('should test sorter function with items that have no hasSubgroupValue', () => {
    const instance = wrapper.instance();
    
    const mockTableData = [
      {
        name: 'item1',
        hasSubgroupValue: false,
        count: 1,
        key: '0'
      },
      {
        name: 'item2',
        hasSubgroupValue: true,
        count: 2,
        key: '1'
      },
      {
        name: 'item3',
        hasSubgroupValue: false,
        count: 3,
        key: '2'
      }
    ];
    
    instance.setState({ tableValue: mockTableData });
    wrapper.update();
    
    const countColumnHeader = wrapper.find('.ant-table-column-sorters').at(1);
    countColumnHeader.simulate('click');
    
    wrapper.update();
  });

  it('should test searchInTable with complex search scenarios', () => {
    const instance = wrapper.instance();
    
    const mockTableData = [
      {
        name: 'parent1',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '0'
      },
      {
        name: 'detail1',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent1',
        searchColor: 'rgb(248,248,248)',
        key: '1'
      },
      {
        name: 'detail2',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent2',
        searchColor: 'rgb(248,248,248)',
        key: '2'
      }
    ];
    
    const searchSet = new Set(['parent1detail1']);
    
    const result = instance.searchInTable(searchSet, mockTableData, null);
    
    expect(result).toBeDefined();
  });

  it('should test searchInTable with uiFind matching and detail items', () => {
    const instance = wrapper.instance();
    
    const mockTableData = [
      {
        name: 'searchterm',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parentitem',
        searchColor: 'rgb(248,248,248)',
        key: '0'
      },
      {
        name: 'parentitem',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '1'
      },
      {
        name: 'childitem',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'searchterm',
        searchColor: 'rgb(248,248,248)',
        key: '2'
      }
    ];
    
    const result = instance.searchInTable(undefined, mockTableData, 'searchterm');
    
    const highlightedItems = result.filter(item => item.searchColor === 'rgb(255,243,215)');
    expect(highlightedItems.length).toBeGreaterThan(0);
  });

  it('should test searchInTable with items that have subgroup values but are details', () => {
    const instance = wrapper.instance();
    
    const mockTableData = [
      {
        name: 'item1',
        isDetail: true,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: undefined,
        key: '0'
      },
      {
        name: 'item2',
        isDetail: false,
        hasSubgroupValue: false,
        parentElement: 'none',
        searchColor: undefined,
        key: '1'
      }
    ];
    
    const result = instance.searchInTable(undefined, mockTableData, null);
    
    expect(result[0].searchColor).toBe('rgb(248,248,248)');
    expect(result[1].searchColor).toBe('rgb(248,248,248)');
  });
});
