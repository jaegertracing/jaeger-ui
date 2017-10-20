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

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';

describe('<AccordianLogs>', () => {
  let wrapper;

  const logs = [
    {
      timestamp: 10,
      fields: [{ key: 'message', value: 'oh the log message' }, { key: 'something', value: 'else' }],
    },
    {
      timestamp: 20,
      fields: [{ key: 'message', value: 'oh the next log message' }, { key: 'more', value: 'stuff' }],
    },
  ];
  const props = {
    logs,
    isOpen: false,
    onItemToggle: jest.fn(),
    onToggle: () => {},
    openedItems: new Set([logs[1]]),
    timestamp: 5,
  };

  beforeEach(() => {
    props.onItemToggle.mockReset();
    wrapper = shallow(<AccordianLogs {...props} />);
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
    wrapper.setProps({ isOpen: true });
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
    wrapper.setProps({ isOpen: true });
    const logViews = wrapper.find(AccordianKeyValues);
    logViews.forEach((node, i) => {
      expect(node.prop('isOpen')).toBe(props.openedItems.has(logs[i]));
    });
  });
});
