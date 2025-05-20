// Copyright (c) 2021 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
