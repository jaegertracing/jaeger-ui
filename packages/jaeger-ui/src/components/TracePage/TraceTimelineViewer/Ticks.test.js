// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';

import Ticks from './Ticks';

describe('<Ticks>', () => {
  it('renders without exploding', () => {
    const { container } = render(<Ticks endTime={200} numTicks={5} showLabels startTime={100} />);
    expect(container).toBeDefined();
  });
});
