// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TraceIdInput from './TraceIdInput';

describe('TraceIdInput', () => {
  const props = {
    selectTrace: jest.fn(),
  };

  it('renders as expected', () => {
    render(<TraceIdInput {...props} />);

    // Check for the text rendered by addonBefore
    expect(screen.getByText('Select by Trace ID')).toBeInTheDocument();

    // Check for the input element
    expect(screen.getByRole('searchbox')).toBeInTheDocument();

    // Check for the search button (Ant Design Search renders a button)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
