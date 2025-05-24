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
import '@testing-library/jest-dom';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import * as track from './KeyboardShortcutsHelp.track';

describe('KeyboardShortcutsHelp', () => {
  const testClassName = 'test--ClassName';
  let trackSpy;

  beforeAll(() => {
    trackSpy = jest.spyOn(track, 'default');
  });

  beforeEach(() => {
    trackSpy.mockReset();
    render(<KeyboardShortcutsHelp className={testClassName} / data-testid="keyboardshortcutshelp">);
  });

  it('renders as expected', () => {
    const buttonElement = screen.getByRole('button');
    expect(buttonElement.className).toContain(testClassName);
  });

  it('opens modal and tracks its opening', () => {
    const buttonElement = screen.getByRole('button');
    let modalElement = screen.queryByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeInTheDocument();

    fireEvent.click(buttonElement);
    modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).toBeInTheDocument();

    expect(trackSpy).toHaveBeenCalled();
  });

  it('closes modal on cancel', async () => {
    const buttonElement = screen.getByRole('button');
    fireEvent.click(buttonElement);
    const closeButton = screen.getByLabelText('Close', { selector: 'button' });
    fireEvent.click(closeButton);
    const modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeVisible();
  });

  it('closes modal on ok', async () => {
    const buttonElement = screen.getByRole('button');
    fireEvent.click(buttonElement);
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);
    const modalElement = screen.getByText('Keyboard Shortcuts');
    expect(modalElement).not.toBeVisible();
  });
});
