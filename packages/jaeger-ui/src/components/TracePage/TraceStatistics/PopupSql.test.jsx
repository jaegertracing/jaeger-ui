// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PopupSql from './PopupSql';

describe('<PopupSQL />', () => {
  const popupContent = 'SELECT * FROM users WHERE id = ?';
  const closePopupMock = jest.fn();

  const defaultProps = {
    closePopup: closePopupMock,
    popupContent,
  };

  beforeEach(() => {
    closePopupMock.mockClear();
    render(<PopupSql {...defaultProps} />);
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
