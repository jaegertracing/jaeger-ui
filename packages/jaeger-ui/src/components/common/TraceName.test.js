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
import { shallow } from 'enzyme';
import TraceName from './TraceName';
import { fetchedState } from '../../constants';

describe('<TraceName>', () => {
  let wrapper;
  let defaultProps;

  beforeEach(() => {
    defaultProps = {};
    wrapper = shallow(<TraceName {...defaultProps} />);
  });

  it('renders with default props', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with className', () => {
    const props = { ...defaultProps, className: 'TEST-CLASS-NAME' };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders with traceName', () => {
    const props = { ...defaultProps, traceName: 'TEST-TRACE-NAME' };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders in loading state', () => {
    const props = { ...defaultProps, state: fetchedState.LOADING };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders in error state', () => {
    const props = { ...defaultProps, state: fetchedState.ERROR, error: 'TEST-ERROR-MESSAGE' };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders error object in error state', () => {
    const props = { ...defaultProps, state: fetchedState.ERROR, error: new Error('ERROR-OBJECT-MESSAGE') };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders empty string error in error state', () => {
    const props = { ...defaultProps, state: fetchedState.ERROR, error: '' };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders error object with empty message in error state', () => {
    const props = { ...defaultProps, state: fetchedState.ERROR, error: new Error('') };
    wrapper = shallow(<TraceName {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
