// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonitorATMEmptyState from '.';
import { getConfigValue } from '../../../utils/config/get-config';

jest.mock('../../../utils/config/get-config', () => ({
  getConfigValue: jest.fn(),
}));

describe('<MonitorATMEmptyState>', () => {
  const mockClickHandler = jest.fn();

  beforeEach(() => {
    getConfigValue.mockReturnValue({
      mainTitle: 'Get started with Service Performance Monitoring',
      subTitle: 'subtitle',
      description: 'description',
      button: {
        text: 'Click Me',
        onClick: mockClickHandler,
      },
    });

    render(<MonitorATMEmptyState />);
  });

  it('renders the title', () => {
    expect(screen.getByText('Get started with Service Performance Monitoring')).toBeInTheDocument();
  });

  it('calls the onClick handler when button is clicked', () => {
    const button = screen.getByText('Click Me');
    fireEvent.click(button);
    expect(mockClickHandler).toHaveBeenCalled();
  });
});
