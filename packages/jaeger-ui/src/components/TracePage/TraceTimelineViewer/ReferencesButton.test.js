// Copyright (c) 2019 Uber Technologies, Inc.
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
import { shallow, mount } from 'enzyme';
import { Menu, Dropdown } from 'antd';

import ReferencesButton from './ReferencesButton';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';
import NewWindowIcon from '../../common/NewWindowIcon';

describe('ReferencesButton', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
  const focusMock = jest.fn();
  const oneReference = trace.spans[1].references;

  const moreReferences = oneReference.slice();
  moreReferences.push({
    refType: 'CHILD_OF',
    traceID: trace.traceID,
    spanID: trace.spans[2].spanID,
  });
  const baseProps = {
    uiFind: null,
    history: {
      replace: () => {},
    },
    location: {
      search: null,
    },
    traceID: trace.traceID,
    trace: {
      data: trace,
    },
    focusSpan: focusMock,
  };
  describe('rendering', () => {
    it('rendering as expected', () => {
      const props = { ...baseProps, references: oneReference };
      const wrapper = shallow(<ReferencesButton {...props} />);
      expect(wrapper).toMatchSnapshot();
    });

    it('rendering as with external reference', () => {
      const oneExternal = [{ ...oneReference[0] }];
      oneExternal[0].traceID = 'extTrace';
      oneExternal[0].spanID = 'extSpanID';

      const props = { ...baseProps, references: oneExternal };
      const wrapper = shallow(<ReferencesButton {...props} />);
      expect(wrapper).toMatchSnapshot();
    });

    it('render with dropdown', () => {
      const props = { ...baseProps, references: moreReferences };
      const wrapper = shallow(<ReferencesButton {...props} />);
      const dropdown = wrapper.find(Dropdown);
      expect(dropdown.length).toBe(1);
      const menuInstance = shallow(dropdown.first().props().overlay);
      const submenuItems = menuInstance.find(Menu.Item);
      expect(submenuItems.length).toBe(2);
    });

    it('render with dropdown and mix of external and internal', () => {
      const mixRef = oneReference.slice();
      const oneExternal = { ...oneReference[0] };
      oneExternal.traceID = 'extTrace';
      oneExternal.spanID = 'extSpanID';
      mixRef.push(oneExternal);
      const props = { ...baseProps, references: mixRef };
      const wrapper = shallow(<ReferencesButton {...props} />);
      const dropdown = wrapper.find(Dropdown);
      expect(dropdown.length).toBe(1);
      const menuInstance = shallow(dropdown.first().props().overlay);
      const submenuItems = menuInstance.find(Menu.Item);
      expect(submenuItems.length).toBe(2);
      expect(submenuItems.at(1).find('a[href="/trace/extTrace/uiFind?=extSpanID"]').length).toBe(1);
      expect(submenuItems.at(1).find(NewWindowIcon).length).toBe(1);
    });
  });

  describe('navigate to reference', () => {
    beforeEach(() => {
      focusMock.mockReset();
    });

    it('calls updateUiFind and focusUiFindMatches with correct kwargs', () => {
      const props = { ...baseProps, references: oneReference };
      const wrapper = shallow(<ReferencesButton {...props} />);
      wrapper.find('a').simulate('click');
      expect(focusMock).toHaveBeenLastCalledWith(trace.spans[1].references[0].spanID);
    });

    it('calls updateUiFind and focusUiFindMatches with correct kwargs on dropdown', () => {
      const props = { ...baseProps, references: moreReferences };
      const wrapper = mount(<ReferencesButton {...props} />);
      const dropdown = wrapper.find(Dropdown);
      dropdown.find('.multi-parent-button').simulate('click');
      const menuInstance = shallow(dropdown.first().props().overlay);
      const submenuItems = menuInstance.find(Menu.Item);
      submenuItems
        .at(0)
        .find('a')
        .simulate('click');
      expect(focusMock).toHaveBeenLastCalledWith(trace.spans[1].references[0].spanID);
    });
  });
});
