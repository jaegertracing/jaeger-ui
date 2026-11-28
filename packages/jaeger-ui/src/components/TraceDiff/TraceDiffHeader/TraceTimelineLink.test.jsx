// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
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

  it('has an accessible name', () => {
    const link = screen.getByRole('link', { name: `Open trace ${traceID.slice(0, 7)} in a new window` });
    expect(link).toBeTruthy();
    expect(link.getAttribute('target')).toBe('_blank');
  });
});

describe('TraceTimelineLink when new pages are forbidden', () => {
  let getConfigSpy;

  beforeEach(() => {
    getConfigSpy = vi.spyOn(getConfigModule, 'default').mockReturnValue({ forbidNewPage: true });
    render(<TraceTimelineLink traceID="test-trace-id" />);
  });

  afterEach(() => {
    getConfigSpy.mockRestore();
  });

  it('does not mention a new window in the accessible name', () => {
    const link = screen.getByRole('link', { name: 'Open trace test-tr' });
    expect(link.getAttribute('target')).toBe('');
  });
});

describe('TraceTimelineLink without traceID', () => {
  it('falls back to generic accessible name without short trace ID', () => {
    render(<TraceTimelineLink />);
    expect(screen.getByRole('link', { name: 'Open trace in a new window' })).toBeTruthy();
  });
});
