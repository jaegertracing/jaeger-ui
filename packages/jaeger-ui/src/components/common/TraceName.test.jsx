// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import TraceName from './TraceName';
import { fetchedState } from '../../constants';

import '@testing-library/jest-dom';

describe('<TraceName>', () => {
  it('renders correctly when no props are passed', () => {
    render(<TraceName />);

    expect(screen.getByTestId('traceName')).toBeInTheDocument();
  });

  it('renders with className', () => {
    const props = { className: 'TEST-CLASS-NAME' };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveClass('TEST-CLASS-NAME');
  });

  it('renders with traceName', () => {
    const props = { traceName: 'TEST-TRACE-NAME' };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveTextContent('TEST-TRACE-NAME');
  });

  it('renders in loading state', () => {
    const props = { state: fetchedState.LOADING };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('loadingIndicator')).toBeInTheDocument();
  });

  it('renders in error state', () => {
    const props = { state: fetchedState.ERROR, error: 'TEST-ERROR-MESSAGE' };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveClass('is-error');
    expect(screen.getByTestId('traceName')).toHaveTextContent('TEST-ERROR-MESSAGE');
  });

  it('renders error object in error state', () => {
    const props = { state: fetchedState.ERROR, error: new Error('ERROR-OBJECT-MESSAGE') };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveClass('is-error');
    expect(screen.getByTestId('traceName')).toHaveTextContent('ERROR-OBJECT-MESSAGE');
  });

  it('renders empty string error in error state', () => {
    const props = { state: fetchedState.ERROR, error: '' };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveClass('is-error');
    expect(screen.getByTestId('traceName')).toHaveTextContent('Error: Unknown error');
  });

  it('renders error object with empty message in error state', () => {
    const props = { state: fetchedState.ERROR, error: new Error('') };
    render(<TraceName {...props} />);

    expect(screen.getByTestId('traceName')).toHaveClass('is-error');
    expect(screen.getByTestId('traceName')).toHaveTextContent('Error');
  });
});
