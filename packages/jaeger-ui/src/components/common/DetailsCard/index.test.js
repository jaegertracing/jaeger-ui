// Copyright (c) 2020 Uber Technologies, Inc.
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

import DetailsCard from '.';

describe('DetailsCard', () => {
  const header = 'Details Card Header';

  it('renders string details', () => {
    const details = 'test details';
    expect(shallow(<DetailsCard details={details} header={header} />)).toMatchSnapshot();
  });

  it('handles empty details array', () => {
    const details = [];
    expect(shallow(<DetailsCard details={details} header={header} />)).toMatchSnapshot();
  });

  it('renders list details', () => {
    const details = ['foo', 'bar', 'baz'];
    expect(shallow(<DetailsCard details={details} header={header} />)).toMatchSnapshot();
  });

  it('renders table details', () => {
    const details = [{ value: 'foo' }];
    expect(shallow(<DetailsCard details={details} header={header} />)).toMatchSnapshot();
  });

  it('renders table details with column defs', () => {
    const columnDefs = ['col'];
    const details = [{ [columnDefs[0]]: 'foo' }];
    expect(
      shallow(<DetailsCard columnDefs={columnDefs} details={details} header={header} />)
    ).toMatchSnapshot();
  });

  it('renders with description', () => {
    const description = 'test description';
    expect(shallow(<DetailsCard description={description} header={header} />)).toMatchSnapshot();
  });

  it('renders with className', () => {
    const className = 'test className';
    expect(shallow(<DetailsCard className={className} header={header} />)).toMatchSnapshot();
  });

  it('renders as collapsible', () => {
    expect(shallow(<DetailsCard header={header} />).state('collapsed')).toBe(false);

    const wrapper = shallow(<DetailsCard collapsible header={header} />);
    expect(wrapper.state('collapsed')).toBe(true);
    expect(wrapper).toMatchSnapshot();

    wrapper.find('button').simulate('click');
    expect(wrapper.state('collapsed')).toBe(false);

    wrapper.find('button').simulate('click');
    expect(wrapper.state('collapsed')).toBe(true);
  });
});
