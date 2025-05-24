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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccordianText from './AccordianText';
import TextList from './TextList';

const warnings = ['Duplicated tag', 'Duplicated spanId'];

describe('<AccordianText>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<AccordianText {...props} / data-testid="accordiantext">));
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the label', () => {
    const header = wrapper.find(`.AccordianText--header > strong`);
    expect(header.length).toBe(1);
    expect(header.text()).toBe(props.label);
  });

  it('renders the content when it is expanded', () => {
    rendered = render({ isOpen: true });
    const content = wrapper.find(TextList);
    expect(content.length).toBe(1);
    expect(content.prop('data')).toBe(warnings);
  });

  it('disables onClick if data is empty', () => {
    wrapper = shallow(<AccordianText {...props} data={[]} / data-testid="accordiantext">);
    const headerProps = screen.getByTestId('.AccordianText--header');
    expect(headerProps.onClick).toBeNull();
  });

  it('has role="switch" when interactive = true', () => {
    wrapper = shallow(<AccordianText {...props} isOpen / data-testid="accordiantext">);
    const headerProps = screen.getByTestId('.AccordianText--header');
    expect(headerProps.role).toBe('switch');
  });

  it('has class "is-empty" class if data is empty', () => {
    wrapper = shallow(<AccordianText {...props} data={[]} / data-testid="accordiantext">);
    expect(wrapper.find('.AccordianText--header').hasClass('is-empty')).toBe(true);
  });

  it('has class "is-high-contrast" class if highContrast=true', () => {
    wrapper = shallow(<AccordianText {...props} highContrast / data-testid="accordiantext">);
    expect(wrapper.find('.AccordianText--header').hasClass('is-high-contrast')).toBe(true);
  });

  it('does not render arrow or clickable header if interactive = false', () => {
    wrapper = shallow(<AccordianText {...props} interactive={false} / data-testid="accordiantext">);
    const header = wrapper.find('.AccordianText--header');
    expect(header.prop('role')).toBeUndefined();
    expect(header.find('.u-align-icon').exists()).toBe(false);
  });
});
