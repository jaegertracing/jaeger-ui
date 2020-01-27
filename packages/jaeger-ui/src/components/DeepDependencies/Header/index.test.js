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
import { shallow } from 'enzyme';
import { Tooltip } from 'antd';
import MdVisibility from 'react-icons/lib/md/visibility';
import MdVisibilityOff from 'react-icons/lib/md/visibility-off';

import Header from './index';
import HopsSelector from './HopsSelector';
import NameSelector from '../../common/NameSelector';
import * as track from '../index.track';

describe('<Header>', () => {
  const minProps = {
    clearOperation: () => {},
    setDistance: () => {},
    setOperation: jest.fn(),
    setService: () => {},
  };
  const service = 'testService';
  const services = [service];
  const operation = 'testOperation';
  const operations = [operation];
  let trackSetOpSpy;
  let wrapper;

  beforeAll(() => {
    trackSetOpSpy = jest.spyOn(track, 'trackHeaderSetOperation');
  });

  beforeEach(() => {
    wrapper = shallow(<Header {...minProps} />);
  });

  it('renders with minimal props', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('omits the operation selector if a service is not selected', () => {
    const nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(1);
    expect(nameSelector.prop('label')).toMatch(/service/i);
  });

  it('renders the operation selector iff a service is selected', () => {
    let nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(1);
    wrapper.setProps({ service, services });
    nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(2);
    expect(nameSelector.at(1).prop('label')).toMatch(/operation/i);
    expect(wrapper).toMatchSnapshot();

    wrapper.setProps({ operation, operations });
    expect(wrapper).toMatchSnapshot();
  });

  it('tracks when operation selector sets a value', () => {
    wrapper.setProps({ service, services });
    const testOp = 'test operation';
    expect(trackSetOpSpy).not.toHaveBeenCalled();

    wrapper
      .find(NameSelector)
      .at(1)
      .prop('setValue')(testOp);
    expect(trackSetOpSpy).toHaveBeenCalledTimes(1);
    expect(minProps.setOperation).toHaveBeenCalledWith(testOp);
  });

  it('renders the hops selector if distanceToPathElems is provided', () => {
    wrapper.setProps({
      distanceToPathElems: new Map(),
      visEncoding: '3',
    });
    expect(wrapper.find(HopsSelector).length).toBe(1);
    expect(wrapper).toMatchSnapshot();
  });

  it('focuses uiFindInput IFF rendered when clicking on wrapping div', () => {
    const click = () => wrapper.find('.DdgHeader--uiFind').simulate('click');
    const focus = jest.fn();
    click();

    wrapper.instance()._uiFindInput = { current: { focus } };
    click();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  describe('uiFind match information', () => {
    const getBtn = () => wrapper.find('button');
    const getMatchesInfo = () => wrapper.find('.DdgHeader--uiFindInfo');
    const getTooltip = () => wrapper.find(Tooltip);
    const hiddenUiFindMatches = new Set(['hidden', 'match', 'vertices']);
    const uiFindCount = 20;
    const expectedFindCount = expect.stringContaining(`${uiFindCount}`);
    const expectedHiddenCount = expect.stringContaining(`${hiddenUiFindMatches.size}`);
    const expectedHiddenTitle = `Click to view ${hiddenUiFindMatches.size} hidden matches`;

    it('renders no info if count is `undefined`', () => {
      expect(getMatchesInfo()).toHaveLength(0);
      expect(getTooltip()).toHaveLength(0);
    });

    it('renders count if `hiddenUiFindMatches` is `undefined` or empty', () => {
      const expectedTitle = 'All matches are visible';

      wrapper.setProps({ uiFindCount });
      expect(getMatchesInfo().text()).toEqual(expectedFindCount);
      expect(getMatchesInfo().text()).not.toEqual(expectedHiddenCount);
      expect(getTooltip().prop('title')).toBe(expectedTitle);
      expect(getBtn().prop('disabled')).toBe(true);
      expect(wrapper.find(MdVisibility)).toHaveLength(1);
      expect(wrapper.find(MdVisibilityOff)).toHaveLength(0);

      wrapper.setProps({ hiddenUiFindMatches: new Set() });
      expect(getMatchesInfo().text()).toEqual(expectedFindCount);
      expect(getMatchesInfo().text()).not.toEqual(expectedHiddenCount);
      expect(getTooltip().prop('title')).toBe(expectedTitle);
      expect(getBtn().prop('disabled')).toBe(true);
      expect(wrapper.find(MdVisibility)).toHaveLength(1);
      expect(wrapper.find(MdVisibilityOff)).toHaveLength(0);
    });

    it('renders both visible and hidden counts if both are provided', () => {
      wrapper.setProps({ hiddenUiFindMatches, uiFindCount });

      expect(getMatchesInfo().text()).toEqual(expectedFindCount);
      expect(getMatchesInfo().text()).toEqual(expectedHiddenCount);
      expect(getTooltip().prop('title')).toBe(expectedHiddenTitle);
      expect(getBtn().prop('disabled')).toBe(false);
      expect(wrapper.find(MdVisibility)).toHaveLength(1);
      expect(wrapper.find(MdVisibilityOff)).toHaveLength(1);
    });

    it('renders 0 with correct tooltip if there are no visible nor hidden matches', () => {
      const expectedTitle = 'No matches';
      wrapper.setProps({ uiFindCount: 0 });

      expect(getMatchesInfo().text()).toBe('0');
      expect(getTooltip().prop('title')).toBe(expectedTitle);
      expect(getBtn().prop('disabled')).toBe(true);
      expect(wrapper.find(MdVisibility)).toHaveLength(0);
      expect(wrapper.find(MdVisibilityOff)).toHaveLength(0);
    });

    it('renders 0 with correct tooltip if there are no matches but there are hidden matches', () => {
      wrapper.setProps({ uiFindCount: 0 });
      wrapper.setProps({ hiddenUiFindMatches });

      expect(getMatchesInfo().text()).toEqual(expect.stringContaining('0'));
      expect(getMatchesInfo().text()).toEqual(expectedHiddenCount);
      expect(getTooltip().prop('title')).toBe(expectedHiddenTitle);
      expect(getBtn().prop('disabled')).toBe(false);
      expect(wrapper.find(MdVisibility)).toHaveLength(1);
      expect(wrapper.find(MdVisibilityOff)).toHaveLength(1);
    });

    it('renders correct plurality in tooltip', () => {
      const expectedTitle = 'Click to view 1 hidden match';
      wrapper.setProps({ hiddenUiFindMatches: new Set([Array.from(hiddenUiFindMatches)[0]]), uiFindCount });

      expect(getTooltip().prop('title')).toBe(expectedTitle);
    });

    it('calls props.showVertices with vertices in props.hiddenUiFindMatches when clicked with hiddenUiFindMatches', () => {
      const showVertices = jest.fn();
      wrapper.setProps({ showVertices, uiFindCount });
      getBtn().simulate('click');
      expect(showVertices).toHaveBeenCalledTimes(0);

      wrapper.setProps({ hiddenUiFindMatches });
      getBtn().simulate('click');
      expect(showVertices).toHaveBeenCalledTimes(1);
      expect(showVertices).toHaveBeenCalledWith(Array.from(hiddenUiFindMatches));
    });
  });
});
