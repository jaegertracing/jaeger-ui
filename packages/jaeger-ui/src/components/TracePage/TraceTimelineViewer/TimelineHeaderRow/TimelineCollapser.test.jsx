// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineCollapser from './TimelineCollapser';

describe('<TimelineCollapser>', () => {
  let props;

  beforeEach(() => {
    props = {
      onCollapseAll: vi.fn(),
      onCollapseOne: vi.fn(),
      onExpandAll: vi.fn(),
      onExpandOne: vi.fn(),
    };
  });

  it('renders without exploding', () => {
    const { container } = render(<TimelineCollapser {...props} />);
    expect(container).toBeDefined();
  });

  it('handles clicks correctly', () => {
    const { getByRole } = render(<TimelineCollapser {...props} />);

    fireEvent.click(getByRole('button', { name: 'Expand +1' }));
    expect(props.onExpandOne).toHaveBeenCalled();

    fireEvent.click(getByRole('button', { name: 'Collapse +1' }));
    expect(props.onCollapseOne).toHaveBeenCalled();

    fireEvent.click(getByRole('button', { name: 'Expand All' }));
    expect(props.onExpandAll).toHaveBeenCalled();

    fireEvent.click(getByRole('button', { name: 'Collapse All' }));
    expect(props.onCollapseAll).toHaveBeenCalled();
  });

  it('handles keyboard Enter events correctly', () => {
    const { getByRole } = render(<TimelineCollapser {...props} />);

    const expandBtn = getByRole('button', { name: 'Expand +1' });

    fireEvent.keyDown(expandBtn, { key: 'Enter' });
    expect(props.onExpandOne).toHaveBeenCalled();
  });

  it('handles keyboard Space events correctly', () => {
    const { getByRole } = render(<TimelineCollapser {...props} />);

    const collapseAllBtn = getByRole('button', { name: 'Collapse All' });

    fireEvent.keyDown(collapseAllBtn, { key: ' ' });
    expect(props.onCollapseAll).toHaveBeenCalled();
  });
});
