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
import { render } from '@testing-library/react'

import CountCard from './CountCard';

describe('CountCard', () => {
  const count = 108;
  const title = 'Test Title';

  it('renders null when props.count or props.title is absent', () => {
    const {wrapper} = render(<CountCard count={count} />)
    expect(wrapper.firstChild).toBe(null);
    const {container} = render(<CountCard title={title} />)
    expect(container.firstChild).type().toBe(null);
  });

  it('renders as expected when given count and title', () => {
    const {container} = render(<CountCard count={count} title={title} />)
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders as expected when given count, title, and examples', () => {
    const {container} = render(<CountCard count={count} title={title} examples={['foo']} />)
    expect(container.firstChild).toMatchSnapshot();
  });
});
