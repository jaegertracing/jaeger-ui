// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ResultItemError from './ResultItemError';

describe('<ResultItemError>', () => {
  it('renders the trace ID and error label', () => {
    render(<ResultItemError traceID="abc123" message="trace not found" />);
    expect(screen.getByText('Trace fetch failed:')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('trace not found')).toBeInTheDocument();
  });

  it('omits the message paragraph when no message is provided', () => {
    const { container } = render(<ResultItemError traceID="abc123" />);
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(container.querySelector('.ResultItemError--message')).toBeNull();
  });
});
