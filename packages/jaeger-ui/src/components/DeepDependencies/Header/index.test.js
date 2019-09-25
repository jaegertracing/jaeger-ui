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

import Header from './index';
import HopsSelector from './HopsSelector';
import NameSelector from './NameSelector';

describe('<Header>', () => {
  const minProps = {
    setDistance: () => {},
    setOperation: () => {},
    setService: () => {},
  };
  const service = 'testService';
  const services = [service];
  const operation = 'testOperation';
  const operations = [operation];
  let wrapper;

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

  it('renders the operation selector if a service is selected', () => {
    let nameSelector = wrapper.find(NameSelector);
    wrapper.setProps({ service, services });
    nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(2);
    expect(nameSelector.at(1).prop('label')).toMatch(/operation/i);
    expect(wrapper).toMatchSnapshot();

    wrapper.setProps({ operation, operations });
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the hops selector if distanceToPathElems is provided', () => {
    wrapper.setProps({
      distanceToPathElems: new Map(),
      visEncoding: '3',
    });
    expect(wrapper.find(HopsSelector).length).toBe(1);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the expected uiFind matches information', () => {
    const getMatchesInfo = () => wrapper.find('.DdgHeader--uiFindInfo').text();
    expect(getMatchesInfo()).toBe('');

    const uiFindCount = 20;
    wrapper.setProps({ uiFindCount });
    expect(getMatchesInfo()).toBe(`${uiFindCount}`);

    wrapper.setProps({ hiddenUiFindMatches: new Set() });
    expect(getMatchesInfo()).toBe(`${uiFindCount}`);

    const hiddenUiFindMatches = new Set(['hidden', 'match', 'vertices']);
    wrapper.setProps({ hiddenUiFindMatches });
    expect(getMatchesInfo()).toBe(`${uiFindCount} / ${uiFindCount + hiddenUiFindMatches.size}`);
  });

  it('focuses uiFindInput IFF rendered when clicking on wrapping div', () => {
    const click = () => wrapper.find('.DdgHeader--uiFind').simulate('click');
    const focus = jest.fn();
    click();

    wrapper.instance()._uiFindInput = { current: { focus } };
    click();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
