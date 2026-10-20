// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';

import * as getTargetModule from '../../../utils/config/get-target';
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
    expect(screen.getByRole('link', { name: 'Open trace in a new window' })).toBeTruthy();
  });
});

describe('TraceTimelineLink when new pages are forbidden', () => {
  let getTargetSpy;

  beforeEach(() => {
    getTargetSpy = jest.spyOn(getTargetModule, 'getTargetEmptyOrBlank').mockReturnValue('');
    render(<TraceTimelineLink traceID="test-trace-id" />);
  });

  afterEach(() => {
    getTargetSpy.mockRestore();
  });

  it('does not mention a new window in the accessible name', () => {
    const link = screen.getByRole('link', { name: 'Open trace' });
    expect(link.getAttribute('target')).toBe('');
  });
});
