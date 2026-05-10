// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
