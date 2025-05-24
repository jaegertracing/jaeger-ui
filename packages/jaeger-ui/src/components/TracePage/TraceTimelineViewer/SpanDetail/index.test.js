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
jest.mock('../utils');

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import DetailState from './DetailState';
import SpanDetail from './index';
import { formatDuration } from '../utils';
import CopyIcon from '../../../common/CopyIcon';
import LabeledList from '../../../common/LabeledList';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';

describe('<SpanDetail>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<SpanDetail {...props} / data-testid="spandetail">));
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('shows the operation name', () => {
    expect(wrapper.find('h2').text()).toBe(span.operationName);
  });

  it('lists the service name, duration and start time', () => {
    const words = ['Duration:', 'Service:', 'Start Time:'];
    const overview = wrapper.find(LabeledList);
    expect(
      overview
        .prop('items')
        .map(item => item.label)
        .sort()
    ).toEqual(words);
  });

  it('renders the span tags', () => {
    const target = <AccordianKeyValues data={span.tags} label="Tags" isOpen={detailState.isTagsOpen} / data-testid="accordiankeyvalues">;
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    userEvent.toggle(screen.getByTestId({ data: span.tags }));
    expect(props.tagsToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders the process tags', () => {
    const target = (
      <AccordianKeyValues data={span.process.tags} label="Process" isOpen={detailState.isProcessOpen} / data-testid="accordiankeyvalues">
    );
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    userEvent.toggle(screen.getByTestId({ data: span.process.tags }));
    expect(props.processToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders the logs', () => {
    const somethingUniq = {};
    const target = (
      <AccordianLogs
        logs={span.logs}
        isOpen={detailState.logs.isOpen}
        openedItems={detailState.logs.openedItems}
        timestamp={traceStartTime}
      / data-testid="accordianlogs">
    );
    expect(wrapper.containsMatchingElement(target)).toBe(true);
    const accordianLogs = wrapper.find(AccordianLogs);
    accordianLogs.simulate('toggle');
    accordianLogs.simulate('itemToggle', somethingUniq);
    expect(props.logsToggle).toHaveBeenLastCalledWith(span.spanID);
    expect(props.logItemToggle).toHaveBeenLastCalledWith(span.spanID, somethingUniq);
  });

  it('renders the warnings', () => {
    const warningElm = wrapper.find({ data: span.warnings });
    expect(warningElm.length).toBe(1);
    warningElm.simulate('toggle');
    expect(props.warningsToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders the references', () => {
    const refElem = wrapper.find({ data: span.references });
    expect(refElem.length).toBe(1);
    refElem.simulate('toggle');
    expect(props.referencesToggle).toHaveBeenLastCalledWith(span.spanID);
  });

  it('renders CopyIcon with deep link URL', () => {
    expect(wrapper.find(CopyIcon).prop('copyText').includes(`?uiFind=${props.span.spanID}`)).toBe(true);
  });
});
