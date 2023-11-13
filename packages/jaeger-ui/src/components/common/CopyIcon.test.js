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
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import * as copy from 'copy-to-clipboard';

import CopyIcon from './CopyIcon';

jest.mock('copy-to-clipboard');

describe('<CopyIcon />', () => {
  const props = {
    className: 'classNameValue',
    copyText: 'copyTextValue',
    tooltipTitle: 'tooltipTitleValue',
  };
  let copySpy;
  let user;

  beforeAll(() => {
    copySpy = jest.spyOn(copy, 'default');
  });

  beforeEach(() => {
    copySpy.mockReset();
    user = userEvent.setup();
    render(<CopyIcon {...props} />);
  });

  it('renders as expected', () => {
    expect(screen.getByRole('button'));
  });

  it('updates state and copies when clicked', async () => {
    // Intially there should be nothing in the clipboard, and thus the tooltip should have the default title
    await user.hover(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('tooltipTitleValue')).toBeInTheDocument());
    expect(copySpy).not.toHaveBeenCalled();

    // Simulate the click
    await user.click(screen.getByRole('button'));
    await user.hover(screen.getByRole('button'));
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(copySpy).toHaveBeenCalledWith(props.copyText);
  });
});
