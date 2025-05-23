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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';
import CopyIcon from './CopyIcon';

jest.mock('copy-to-clipboard');

describe('<CopyIcon />', () => {
  const props = {
    className: 'classNameValue',
    copyText: 'copyTextValue',
    tooltipTitle: 'tooltipTitleValue',
    buttonText: 'Click to Copy',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    render(<CopyIcon {...props} />);
  });

  it('renders the button with correct text and initial tooltip title', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveClass('CopyIcon');
    expect(copyButton).toHaveClass(props.className);
  });

  it('calls copy-to-clipboard and updates tooltip text when clicked', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    fireEvent.click(copyButton);

    expect(copy).toHaveBeenCalledWith(props.copyText);
  });

  it('resets tooltip text to original title when tooltip hides after copying', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    fireEvent.mouseEnter(copyButton);
    let tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(props.tooltipTitle);

    fireEvent.click(copyButton);

    await waitFor(() => {
      tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Copied');
    });

    fireEvent.mouseLeave(copyButton);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    fireEvent.mouseEnter(copyButton);

    tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(props.tooltipTitle);
  });

  it('shows "Copied" tooltip when clicked and resets on mouse leave', async () => {
    const copyButton = screen.getByRole('button', { name: props.buttonText });

    fireEvent.mouseEnter(copyButton);

    let tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(props.tooltipTitle);

    fireEvent.click(copyButton);

    await waitFor(() => {
      tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Copied');
    });

    fireEvent.mouseLeave(copyButton);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
