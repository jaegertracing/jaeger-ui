// Copyright (c) 2019 Uber Technologies, Inc.
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

import LayoutSettings, { densityOptions } from '.';
import * as track from '../../index.track';
import { EDdgDensity } from '../../../../model/ddg/types';

jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Popover: ({ content }) => <div data-testid="popover-content">{content}</div>,
  };
});

describe('LayoutSettings', () => {
  const props = {
    density: EDdgDensity.PreventPathEntanglement,
    setDensity: jest.fn(),
    showOperations: true,
    toggleShowOperations: jest.fn(),
  };

  const densityIdx = densityOptions.findIndex(({ option }) => option === props.density);

  let trackDensityChangeSpy;
  let trackToggleShowOpSpy;

  beforeAll(() => {
    trackDensityChangeSpy = jest.spyOn(track, 'trackDensityChange');
    trackToggleShowOpSpy = jest.spyOn(track, 'trackToggleShowOp');
  });

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('uses value found in localStorage', () => {
    localStorage.setItem = jest.fn();
    localStorage.getItem = jest.fn().mockReturnValue(EDdgDensity.OnePerLevel);

    render(<LayoutSettings {...props} />);

    expect(localStorage.getItem).toHaveBeenCalledWith('ddg.layout.density');
    expect(props.setDensity).toHaveBeenCalledWith(EDdgDensity.OnePerLevel);
  });

  it('records new selection in localStorage', () => {
    localStorage.setItem = jest.fn();
    const newIdx = 2;
    const newDensity = densityOptions[newIdx].option;

    render(<LayoutSettings {...props} />);
    const popoverContent = screen.getByTestId('popover-content');
    const radioButtons = popoverContent.querySelectorAll('input[type="radio"]');

    fireEvent.click(radioButtons[newIdx]);

    expect(localStorage.setItem).toHaveBeenCalledWith('ddg.layout.density', newDensity);
  });

  it('renders each densityOption', () => {
    render(<LayoutSettings {...props} />);

    const popoverContent = screen.getByTestId('popover-content');
    const radioButtons = popoverContent.querySelectorAll('input[type="radio"]');

    expect(radioButtons.length).toBe(densityOptions.length);
    expect(radioButtons[densityIdx].checked).toBe(true);
  });

  it('updates density and tracks its change', () => {
    const newIdx = 1;
    const newDensity = densityOptions[newIdx].option;

    render(<LayoutSettings {...props} />);
    const popoverContent = screen.getByTestId('popover-content');
    const radioButtons = popoverContent.querySelectorAll('input[type="radio"]');

    fireEvent.click(radioButtons[newIdx]);

    expect(props.setDensity).toHaveBeenCalledWith(newDensity);
    expect(trackDensityChangeSpy).toHaveBeenCalledWith(props.density, newDensity, densityOptions);
  });

  it('no-ops if current density is selected', () => {
    localStorage.setItem = jest.fn();

    render(<LayoutSettings {...props} />);
    const popoverContent = screen.getByTestId('popover-content');
    const radioButtons = popoverContent.querySelectorAll('input[type="radio"]');

    fireEvent.click(radioButtons[densityIdx]);

    expect(props.setDensity).not.toHaveBeenCalled();
    expect(trackDensityChangeSpy).not.toHaveBeenCalled();
  });

  it('renders showOperations checkbox', () => {
    render(<LayoutSettings {...props} />);

    const popoverContent = screen.getByTestId('popover-content');
    const checkbox = popoverContent.querySelector('input[type="checkbox"]');

    expect(checkbox.checked).toBe(props.showOperations);

    const showOperations = !props.showOperations;
    render(<LayoutSettings {...props} showOperations={showOperations} />);

    const updatedPopoverContent = screen.getAllByTestId('popover-content')[1];
    const updatedCheckbox = updatedPopoverContent.querySelector('input[type="checkbox"]');

    expect(updatedCheckbox.checked).toBe(showOperations);
  });

  it('toggles showOperation and tracks its toggle', () => {
    const checked = !props.showOperations;

    render(<LayoutSettings {...props} />);
    const popoverContent = screen.getByTestId('popover-content');
    const checkbox = popoverContent.querySelector('input[type="checkbox"]');

    fireEvent.click(checkbox);

    expect(props.toggleShowOperations).toHaveBeenCalledWith(checked);
    expect(trackToggleShowOpSpy).toHaveBeenCalledWith(checked);
  });
});
