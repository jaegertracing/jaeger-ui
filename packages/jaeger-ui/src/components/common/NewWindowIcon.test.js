// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewWindowIcon from './NewWindowIcon';

describe('NewWindowIcon', () => {
  const props = {
    notIsLarge: 'not is large',
  };
  it('renders without is-large className when props.isLarge is false', () => {
    const { container } = render(<NewWindowIcon {...props} />);
    expect(container.querySelector('.is-large')).toBeNull();
  });

  it('adds is-large className when props.isLarge is true', () => {
    const { rerender, container } = render(<NewWindowIcon {...props} />);

    // Initial render, is-large should be false
    expect(container.querySelector('.is-large')).toBeNull();

    // Re-render with isLarge prop set to true
    rerender(<NewWindowIcon {...props} isLarge />);

    // After re-render, is-large should be true
    expect(container.querySelector('.is-large')).toBeInTheDocument();
  });
});
