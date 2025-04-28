// Copyright (c) 2019 The Jaeger Authors.
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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TraceIdInput from './TraceIdInput';

describe('TraceIdInput', () => {
  const props = {
    selectTrace: jest.fn(),
  };

  it('renders as expected', () => {
    render(<TraceIdInput {...props} />);

    // Check for the text rendered by addonBefore
    expect(screen.getByText('Select by Trace ID')).toBeInTheDocument();

    // Check for the input element
    expect(screen.getByRole('searchbox')).toBeInTheDocument();

    // Check for the search button (Ant Design Search renders a button)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
