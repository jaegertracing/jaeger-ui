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
import { screen, render, waitFor, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom';

import * as copy from 'copy-to-clipboard';

import CopyIcon from './CopyIcon';

jest.mock('copy-to-clipboard');

describe('<CopyIcon />', () => {
  const tooltipTitle = 'testTooltipTitleValue';

  const props = {
    className: 'classNameValue',
    copyText: 'copyTextValue',
    tooltipTitle,
  };
  let copySpy;

  beforeAll(() => {
    copySpy = jest.spyOn(copy, 'default');
  });

  beforeEach(() => {
    copySpy.mockReset();
    render(<CopyIcon {...props} />);
  });

  it('renders as expected', () => {
    expect(screen.getByRole('button'));
  });

  it('updates state and copies when clicked', async () => {
    const triggerElement = screen.getByRole('button');

    // Intially when we hover over the icon, there should be nothing in the clipboard and the tooltip should have the default title
    fireEvent.mouseEnter(triggerElement);
    await waitFor(() => expect(screen.getByText(tooltipTitle)).toBeInTheDocument());
    expect(copySpy).not.toHaveBeenCalled();

    // Simulate the click and check if the tooltip value changes
    fireEvent.click(triggerElement);
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(copySpy).toHaveBeenCalledWith(props.copyText);

    // On undoing the hover state, the tooltip should be removed
    fireEvent.mouseLeave(triggerElement);
    await waitForElementToBeRemoved(() => screen.getByText('Copied'));

    // On hovering again, the tooltip title should be restored
    fireEvent.mouseEnter(triggerElement);
    await waitFor(() => expect(screen.getByText(tooltipTitle)).toBeInTheDocument());
  });
});
