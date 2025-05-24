// Copyright (c) 2023 Uber Technologies, Inc.
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
    render(<DownloadResults {...props} / data-testid="downloadresults">);
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
