// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';

import * as getConfigModule from '../../../utils/config/get-config';
import TraceTimelineLink from './TraceTimelineLink';

describe('TraceTimelineLink', () => {
  const traceID = 'test-trace-id';

  beforeEach(() => {
    render(<TraceTimelineLink traceID={traceID} />);
  });

  it('renders the NewWindowIcon', () => {
    expect(screen.getAllByTestId('NewWindowIcon').length).toBe(1);
  });

  it('links to the given trace', () => {
    const link = screen.getByRole('link');
    const url = new URL(link.href);
    expect(url.pathname).toBe(`/trace/${traceID}`);
  });

  it('stops event propagation', () => {
    // Create an event to capture the click
    const propogatedEvent = createEvent.click(screen.getByRole('link'));
    propogatedEvent.stopPropagation = jest.fn();

    fireEvent(screen.getByRole('link'), propogatedEvent);
    expect(propogatedEvent.stopPropagation).toHaveBeenCalled();
  });

  it('renders link with accessible aria-label and target="_blank"', () => {
    const link = screen.getByRole('link', { name: `Open trace ${traceID.slice(0, 7)} in a new window` });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-label', `Open trace ${traceID.slice(0, 7)} in a new window`);
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('TraceTimelineLink when forbidNewPage is true', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders link with accessible aria-label without "in a new window"', () => {
    const traceID = 'test-trace-id';
    vi.spyOn(getConfigModule, 'default').mockReturnValue({ forbidNewPage: true });
    render(<TraceTimelineLink traceID={traceID} />);
    const link = screen.getByRole('link', { name: `Open trace ${traceID.slice(0, 7)}` });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-label', `Open trace ${traceID.slice(0, 7)}`);
    expect(link).toHaveAttribute('target', '');
  });
});
