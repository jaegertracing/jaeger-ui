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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';

describe('<AccordianLogs>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<AccordianLogs {...props} / data-testid="accordianlogs">));
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('shows the number of log entries', () => {
    const regex = new RegExp(`Logs \\(${logs.length}\\)`);
    expect(wrapper.find('a').text()).toMatch(regex);
  });

  it('hides log entries when not expanded', () => {
    expect(wrapper.find(AccordianKeyValues).exists()).toBe(false);
  });

  it('shows log entries when expanded', () => {
    expect(wrapper.find(AccordianKeyValues).exists()).toBe(false);
    rendered = render({ isOpen: true });
    const logViews = wrapper.find(AccordianKeyValues);
    expect(logViews.length).toBe(logs.length);

    logViews.forEach((node, i) => {
      const log = logs[i];
      expect(node.prop('data')).toBe(log.fields);
      node.simulate('toggle');
      expect(props.onItemToggle).toHaveBeenLastCalledWith(log);
    });
  });

  it('propagates isOpen to log items correctly', () => {
    rendered = render({ isOpen: true });
    const logViews = wrapper.find(AccordianKeyValues);
    logViews.forEach((node, i) => {
      expect(node.prop('isOpen')).toBe(props.openedItems.has(logs[i]));
    });
  });
});
