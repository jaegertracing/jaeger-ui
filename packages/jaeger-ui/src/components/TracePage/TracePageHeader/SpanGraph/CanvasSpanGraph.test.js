// Copyright (c) 2017 Uber Technologies, Inc.
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
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import CanvasSpanGraph, { getColor } from './CanvasSpanGraph';
import * as renderUtils from './render-into-canvas'; // Import the module to mock
import colorGenerator from '../../../../utils/color-generator';

// Mock the renderIntoCanvas function
jest.mock('./render-into-canvas');

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
  });

  it('renders without exploding', () => {
    const { container, rerender } = render(<CanvasSpanGraph {...props} />);
    const canvas = container.querySelector('.CanvasSpanGraph');

    expect(canvas).toBeInTheDocument();
    // Check if renderIntoCanvas was called on mount
    expect(renderUtils.default).toHaveBeenCalledTimes(1);

    // Update props and rerender
    rerender(<CanvasSpanGraph {...props} items={items} />);

    // Check if renderIntoCanvas was called again on update
    expect(renderUtils.default).toHaveBeenCalledTimes(2);
    expect(renderUtils.default).toHaveBeenCalledWith(canvas, items, props.valueWidth, expect.any(Function));
  });

  it('calls colorGenerator.getRgbColorByKey with correct hex', () => {
    const spy = jest.spyOn(colorGenerator, 'getRgbColorByKey');
    const hex = '#abcdef';
    getColor(hex);
    expect(spy).toHaveBeenCalledWith(hex);
    spy.mockRestore();
  });
});
