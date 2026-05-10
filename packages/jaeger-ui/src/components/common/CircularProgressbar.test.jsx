// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen, render } from '@testing-library/react';

import CircularProgressbar from './CircularProgressbar';
import '@testing-library/jest-dom';

describe('CircularProgressbar', () => {
  const minProps = {
    maxValue: 108,
    value: 42,
  };

  const fullProps = {
    ...minProps,
    backgroundHue: 0,
    decorationHue: 120,
    strokeWidth: 8,
    text: 'test text',
  };

  it('handles minimal props', () => {
    render(<CircularProgressbar {...minProps} />);

    expect(screen.getByTestId('circular-progress-bar')).toBeInTheDocument();
  });

  it('renders as expected with all props', () => {
    render(<CircularProgressbar {...fullProps} />);

    expect(screen.getByTestId('circular-progress-bar')).toBeInTheDocument();
    expect(screen.getByText(fullProps.text)).toBeInTheDocument();
  });
});
