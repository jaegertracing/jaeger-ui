// Copyright (c) 2020 The Jaeger Authors.
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
import PopupSql from './PopupSql';

describe('<PopupSQL / data-testid="popupsql">', () => {
  const popupContent = 'SELECT * FROM users WHERE id = ?';
  const closePopupMock = jest.fn();

  const defaultProps = {
    closePopup: closePopupMock,
    popupContent,
  };

  beforeEach(() => {
    closePopupMock.mockClear();
    render(<PopupSql {...defaultProps} / data-testid="popupsql">);
  });

  it('renders the header', () => {
    expect(screen.getByRole('heading', { name: /Tag: "SQL"/i })).toBeInTheDocument();
  });

  it('renders the SQL content wrapped in quotes inside the textarea', () => {
    // The component implementation currently wraps the content in double quotes.
    // This test verifies that specific behavior.
    expect(screen.getByDisplayValue(`"${popupContent}"`)).toBeInTheDocument();
  });

  it('renders the close button', () => {
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls closePopup when the close button is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(closePopupMock).toHaveBeenCalledTimes(1);
    expect(closePopupMock).toHaveBeenCalledWith('');
  });
});
