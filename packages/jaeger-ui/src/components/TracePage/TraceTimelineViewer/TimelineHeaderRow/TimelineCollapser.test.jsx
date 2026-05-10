// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineCollapser from './TimelineCollapser';

describe('<TimelineCollapser>', () => {
  it('renders without exploding', () => {
    const props = {
      onCollapseAll: () => {},
      onCollapseOne: () => {},
      onExpandAll: () => {},
      onExpandOne: () => {},
    };
    const { container } = render(<TimelineCollapser {...props} />);
    expect(container).toBeDefined();
  });
});
