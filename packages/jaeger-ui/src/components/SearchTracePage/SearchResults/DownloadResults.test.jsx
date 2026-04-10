// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import DownloadResults from './DownloadResults';

describe('DownloadResults button', () => {
  const props = {
    onDownloadResultsClicked: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    render(<DownloadResults {...props} />);
  });

  it('when renders then correct label is showing', () => {
    // Find the button by its text content
    expect(screen.getByRole('button', { name: /Download Results/i })).toBeInTheDocument();
  });

  it('when click then call download results function', () => {
    expect(props.onDownloadResultsClicked).toHaveBeenCalledTimes(0);

    // Find the button and simulate a click
    const button = screen.getByRole('button', { name: /Download Results/i });
    fireEvent.click(button);

    expect(props.onDownloadResultsClicked).toHaveBeenCalledTimes(1);
  });
});
