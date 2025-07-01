// Copyright (c) 2017 Uber Technologies, Inc.
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
import { render } from '@testing-library/react';

import GraphTicks from './GraphTicks';

describe('<GraphTicks>', () => {
  const defaultProps = {
    items: [
      { valueWidth: 100, valueOffset: 25, serviceName: 'a' },
      { valueWidth: 100, valueOffset: 50, serviceName: 'b' },
    ],
    valueWidth: 200,
    numTicks: 4,
  };

  let container;

  beforeEach(() => {
    const { container: c } = render(<GraphTicks {...defaultProps} />);
    container = c;
  });

  it('creates a <g> for ticks', () => {
    const ticksG = container.querySelectorAll('[data-test="ticks"]');
    expect(ticksG.length).toBe(1);
  });

  it('creates a line for each ticks excluding the first and last', () => {
    const lines = container.querySelectorAll('[data-test="ticks"]:nth-child(1) line');
    expect(lines.length).toBe(defaultProps.numTicks - 1);
  });
});
