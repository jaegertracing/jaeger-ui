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
import { Icon, Tooltip } from 'antd';

import CopyIcon from './copy-icon';

describe('<CopyIcon />', () => {
  const props = {
    copyText: 'copyTextValue',
    tooltipTitle: 'tooltipTitleValue',
  };
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<CopyIcon {...props} />);
  });

  it('renders as expected', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('updates state when icon is clicked', () => {
    expect(wrapper.state().hasCopied).toBe(false);
    wrapper.find(Icon).simulate('click');
    expect(wrapper.state().hasCopied).toBe(true);
  });

  it('updates state when tooltip hides', () => {
    wrapper.setState({ hasCopied: true });
    wrapper.find(Tooltip).prop('onVisibleChange')(false);
    expect(wrapper.state().hasCopied).toBe(false);
  });

  it('persists state when tooltip opens', () => {
    wrapper.setState({ hasCopied: true });
    wrapper.find(Tooltip).prop('onVisibleChange')(true);
    expect(wrapper.state().hasCopied).toBe(true);
  });
});
