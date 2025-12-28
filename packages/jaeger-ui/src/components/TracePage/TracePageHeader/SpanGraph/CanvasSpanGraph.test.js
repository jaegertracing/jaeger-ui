// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import CanvasSpanGraph, { getColor } from './CanvasSpanGraph';
import * as renderUtils from './render-into-canvas'; // Import the module to mock
import colorGenerator from '../../../../utils/color-generator';

// Mock the renderIntoCanvas function
jest.mock('./render-into-canvas');

// Mock the ThemeProvider
jest.mock('../../../App/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light', setMode: jest.fn(), toggleMode: jest.fn() }),
}));

describe('<CanvasSpanGraph />', () => {
  const items = [{ valueWidth: 1, valueOffset: 1, serviceName: 'service-name-0' }];
  const props = {
    items: [],
    valueWidth: 4000,
  };

  // Store the original prototype
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    // Mock getContext before each test
    HTMLCanvasElement.prototype.getContext = () => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      // Add other methods if needed by renderIntoCanvas
    });
    // Reset the mock before each test
    renderUtils.default.mockClear();
  });

  afterEach(() => {
    // Restore the original prototype after each test
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    jest.restoreAllMocks();
  });

  it('renders without exploding', () => {
    // Mock getComputedStyle
    window.getComputedStyle = jest.fn().mockReturnValue({
      getPropertyValue: jest.fn().mockReturnValue('#fff'),
    });

    const { container, rerender } = render(<CanvasSpanGraph {...props} />);
    const canvas = container.querySelector('.CanvasSpanGraph');

    expect(canvas).toBeInTheDocument();
    // Check if renderIntoCanvas was called on mount
    expect(renderUtils.default).toHaveBeenCalledTimes(1);

    // Update props and rerender
    rerender(<CanvasSpanGraph {...props} items={items} />);

    // Check if renderIntoCanvas was called again on update
    expect(renderUtils.default).toHaveBeenCalledTimes(2);
    expect(renderUtils.default).toHaveBeenLastCalledWith(
      canvas,
      items,
      props.valueWidth,
      expect.any(Function),
      '#fff'
    );
  });

  it('calls colorGenerator.getRgbColorByKey with correct hex', () => {
    const spy = jest.spyOn(colorGenerator, 'getRgbColorByKey');
    const hex = '#abcdef';
    getColor(hex);
    expect(spy).toHaveBeenCalledWith(hex);
    spy.mockRestore();
  });
});
