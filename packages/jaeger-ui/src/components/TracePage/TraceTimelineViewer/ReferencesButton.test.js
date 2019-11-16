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
import queryString from 'query-string';

import { UnconnectedReferencesButton, mapDispatchToProps, mapStateToProps } from './ReferencesButton';
import updateUiFindSpy from '../../../utils/update-ui-find';
import transformTraceData from '../../../model/transform-trace-data';
import traceGenerator from '../../../demo/trace-generators';

jest.mock('../../../utils/update-ui-find');

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
    traceID: 'trace1',
    trace: {
      data: trace,
    },
    focusUiFindMatches: focusMock,
  };
  describe('rendering', () => {
    it('rendering as expected', () => {
      const props = { ...baseProps, references: oneReference };
      const wrapper = shallow(<UnconnectedReferencesButton {...props} />);
      expect(wrapper).toMatchSnapshot();
    });

    it('render with dropdown', () => {
      const props = { ...baseProps, references: moreReferences };
      const wrapper = shallow(<UnconnectedReferencesButton {...props} />);
      const dropdown = wrapper.find(Dropdown);
      expect(dropdown.length).toBe(1);
      const menuInstance = shallow(dropdown.first().props().overlay);
      const submenuItems = menuInstance.find(Menu.Item);
      expect(submenuItems.length).toBe(2);
    });
  });

  describe('navigate to reference', () => {
    beforeEach(() => {
      focusMock.mockReset();
    });

    it('calls updateUiFind and focusUiFindMatches with correct kwargs', () => {
      const props = { ...baseProps, references: oneReference };
      const wrapper = shallow(<UnconnectedReferencesButton {...props} />);
      wrapper.find('a').simulate('click');
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        history: props.history,
        location: props.location,
        uiFind: trace.spans[1].references[0].spanID,
      });
      expect(focusMock).toHaveBeenLastCalledWith(trace, trace.spans[1].references[0].spanID, true);
    });

    it('calls updateUiFind and focusUiFindMatches with correct kwargs on dropdown', () => {
      const props = { ...baseProps, references: moreReferences };
      const wrapper = mount(<UnconnectedReferencesButton {...props} />);
      const dropdown = wrapper.find(Dropdown);
      dropdown.find('.multi-parent-button').simulate('click');
      const menuInstance = shallow(dropdown.first().props().overlay);
      const submenuItems = menuInstance.find(Menu.Item);
      submenuItems
        .at(0)
        .find('a')
        .simulate('click');
      expect(focusMock).toHaveBeenLastCalledWith(trace, trace.spans[1].references[0].spanID, true);
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        focusUiFindMatches: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    const queryStringParseSpy = jest.spyOn(queryString, 'parse');
    const uiFind = 'span1';

    beforeEach(() => {
      queryStringParseSpy.mockReturnValue({ uiFind });
    });

    it('maps state to props correctly', () => {
      const state = {
        router: {
          location: {
            search: uiFind,
          },
        },
        trace: {
          traces: {
            [trace.traceID]: trace,
          },
        },
      };
      const mappedProps = mapStateToProps(state, {
        traceID: trace.traceID,
      });

      expect(mappedProps).toEqual({
        trace,
        uiFind: 'span1',
      });
    });
  });
});
