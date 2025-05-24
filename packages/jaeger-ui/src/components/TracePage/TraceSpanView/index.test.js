// Copyright (c) 2018 The Jaeger Authors.
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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TraceSpanView from './index';
import transformTraceData from '../../../model/transform-trace-data';

import testTrace from '../TraceStatistics/tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace);

describe('<TraceSpanView>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<TraceSpanView {...defaultProps} / data-testid="tracespanview">);

    userEvent.change(screen.getByTestId({ 'data-testid': 'select-service' }), event);
    expect(wrapper.state('selectedServiceName')).toEqual(['service2']);
  });
  it('Should change value when onChange and Rest the value when called reset', () => {
    const event = ['service2'];
    wrapper = shallow(<TraceSpanView {...defaultProps} / data-testid="tracespanview">);
    userEvent.change(screen.getByTestId({ 'data-testid': 'select-service' }), event);
    expect(wrapper.state('selectedServiceName')).toEqual(['service2']);
    userEvent.click(screen.getByTestId('.reset-filter Button'));
    expect(wrapper.state('selectedServiceName')).toEqual([]);
  });
  it('Should change value when onChange OperatioName DDwas called', () => {
    const event = ['op2', 'op3'];
    wrapper = shallow(<TraceSpanView {...defaultProps} / data-testid="tracespanview">);
    userEvent.change(screen.getByTestId({ 'data-testid': 'select-operation' }), event);
    expect(wrapper.state('selectedOperationName')).toEqual(['op2', 'op3']);
  });
  it('check handler', () => {
    const instance = // RTL doesn't access component instances - use assertions on rendered output instead;
    expect(instance.state.serviceNamesList).toBeDefined();
    expect(instance.state.serviceNamesList.length).toBe(2);
    expect(instance.state.serviceNamesList).toEqual(['service1', 'service2']);
    expect(instance.state.operationNamesList).toBeDefined();
    expect(instance.state.operationNamesList.length).toBe(6);
    expect(instance.state.operationNamesList).toEqual(['op1', 'op2', 'op3', 'op4', 'op6', 'op7']);
  });
});
