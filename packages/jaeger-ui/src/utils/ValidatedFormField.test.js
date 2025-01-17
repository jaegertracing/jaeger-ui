// Copyright (c) 2017 Uber Technologies, Inc.
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
import { render, fireEvent } from '@testing-library/react';
import ValidatedFormField from './ValidatedFormField';

describe('ValidatedFormField', () => {
  const mockValidate = jest.fn();
  const mockOnChange = jest.fn();
  const defaultProps = {
    name: 'formField',
    placeholder: 'formFieldPlaceholder',
    disabled: false,
    validate: mockValidate,
    onChange: mockOnChange,
    value: 'initial value',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByPlaceholderText } = render(<ValidatedFormField {...defaultProps} />);
    expect(getByPlaceholderText('formFieldPlaceholder')).not.toBeNull();
  });

  it('calls validate function with the correct value', () => {
    render(<ValidatedFormField {...defaultProps} />);
    expect(mockValidate).toHaveBeenCalledWith('initial value');
  });

  it('displays Popover when validation fails and blur is true', () => {
    mockValidate.mockReturnValue({ content: 'error content', title: 'error title' });
    const { getByPlaceholderText, getByText } = render(<ValidatedFormField {...defaultProps} />);
    const input = getByPlaceholderText('formFieldPlaceholder');
    fireEvent.blur(input);
    expect(getByText('error content')).not.toBeNull();
  });

  it('hides Popover when validation passes or blur is false', () => {
    mockValidate.mockReturnValue(null);
    const { getByPlaceholderText, queryByText } = render(<ValidatedFormField {...defaultProps} />);
    const input = getByPlaceholderText('formFieldPlaceholder');
    fireEvent.focus(input);
    expect(queryByText('error content')).toBeNull();
  });
});
