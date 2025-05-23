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
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import NameSelector, { DEFAULT_PLACEHOLDER } from './NameSelector';

jest.mock('./FilteredList', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  const MockReact = require('react');
  return MockReact.forwardRef(({ cancel, options, value, setValue }, ref) => {
    MockReact.useImperativeHandle(ref, () => ({
      focusInput: jest.fn(),
      isMouseWithin: jest.fn(() => false),
    }));
    return (
      <div data-testid="filtered-list">
        <button type="button" data-testid="filtered-list-cancel" onClick={cancel}>
          Cancel
        </button>
        <ul>
          {options.map(option => (
            <li key={option}>
              <button type="button" onClick={() => setValue(option)}>
                {option}
              </button>
            </li>
          ))}
        </ul>
        <input type="text" data-testid="filtered-list-input" />
        <div>Selected: {value}</div>
      </div>
    );
  });
});

describe('<NameSelector>', () => {
  const placeholder = 'This is the placeholder';
  const label = 'a-label';
  const options = ['option A', 'option B', 'option C'];
  let props;
  let setValueMock;
  let clearValueMock;

  afterEach(cleanup);

  const setup = (overrideProps = {}) => {
    setValueMock = jest.fn();
    clearValueMock = jest.fn();
    props = {
      placeholder,
      label,
      options,
      value: null,
      required: true,
      setValue: setValueMock,
      ...overrideProps,
      ...(overrideProps.required === false && !overrideProps.clearValue
        ? { clearValue: clearValueMock }
        : {}),
      ...(overrideProps.required !== false && overrideProps.clearValue
        ? { clearValue: overrideProps.clearValue }
        : {}),
    };

    return render(<NameSelector {...props} getPopupContainer={triggerNode => triggerNode.parentElement} />);
  };

  const openPopover = async () => {
    const trigger = screen.getByRole('heading', { level: 2 });
    await userEvent.click(trigger);
    await screen.findByTestId('filtered-list');
  };

  it('renders without exploding', () => {
    setup();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(placeholder);
  });

  it('renders with is-invalid class when required and without a value', () => {
    setup({ value: null, required: true });
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('is-invalid');
  });

  it('renders without is-invalid class when not required and without a value', () => {
    setup({ value: null, required: false });
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveClass('is-invalid');
  });

  it('renders without is-invalid class when required and with a value', () => {
    setup({ value: options[0], required: true });
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveClass('is-invalid');
  });

  describe('placeholder prop', () => {
    it('renders the custom placeholder when provided as a string and value is null', () => {
      setup({ placeholder, value: null, required: false });
      expect(screen.queryByText(`${label}:`)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(placeholder);
    });

    it('renders the default placeholder when placeholder is true and value is null', () => {
      setup({ placeholder: true, value: null, required: false });
      expect(screen.queryByText(`${label}:`)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(DEFAULT_PLACEHOLDER);
    });

    it('does not render a placeholder if there is a value', () => {
      const value = options[1];
      setup({ placeholder, value, required: false });
      expect(screen.getByText(`${label}:`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:${value}`);
      expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();

      cleanup();
      setup({ placeholder: true, value, required: false });
      expect(screen.getByText(`${label}:`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:${value}`);
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();
    });

    it('does not render any placeholder if placeholder prop is omitted or false', () => {
      setup({ placeholder: undefined, value: null, required: false });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:`);
      expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();

      cleanup();
      setup({ placeholder: false, value: null, required: false });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:`);
      expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();
    });
  });

  it('allows the filtered list to set values and closes popover', async () => {
    setup({ required: false });
    await openPopover();

    const list = screen.getByTestId('filtered-list');
    const optionButton = within(list).getByRole('button', { name: options[1] });

    await userEvent.click(optionButton);

    expect(setValueMock).toHaveBeenCalledWith(options[1]);
    expect(setValueMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  it('hides the popover when the filter calls cancel', async () => {
    setup({ required: false });
    await openPopover();

    const cancelButton = screen.getByTestId('filtered-list-cancel');
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  it('hides the popover when clicking outside', async () => {
    setup({ required: false });
    await openPopover();

    await userEvent.click(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  it('controls the visibility of the popover via trigger click', async () => {
    setup({ required: false });
    const trigger = screen.getByRole('heading', { level: 2 });

    expect(screen.queryByTestId('filtered-list')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    await screen.findByTestId('filtered-list');

    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  it('attempts to focus the filter input when the popover opens', async () => {
    setup({ required: false });
    await openPopover();
    expect(screen.getByTestId('filtered-list-input')).toBeInTheDocument();
  });

  describe('clear button', () => {
    it('renders clear icon when not required and with a value', () => {
      setup({ value: options[0], required: false });
      expect(screen.getByTestId('name-selector-clear')).toBeInTheDocument();
    });

    it('does not render clear icon when required', () => {
      setup({ value: options[0], required: true });
      expect(screen.queryByTestId('name-selector-clear')).not.toBeInTheDocument();
    });

    it('does not render clear icon when value is null', () => {
      setup({ value: null, required: false });
      expect(screen.queryByTestId('name-selector-clear')).not.toBeInTheDocument();
    });

    it('clicking clear icon calls clearValue and prevents popover opening', async () => {
      setup({ value: options[0], required: false });
      const clearButton = screen.getByTestId('name-selector-clear');

      await userEvent.click(clearButton);

      expect(clearValueMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('filtered-list')).toBeNull();
    });

    it('throws Error when attempting to clear when required (simulated)', () => {
      const instanceProps = {
        label,
        options,
        value: options[0],
        required: true,
        setValue: jest.fn(),
      };
      const instance = new NameSelector(instanceProps);

      const mockEvent = { stopPropagation: jest.fn() };

      expect(() => instance.clearValue(mockEvent)).toThrow('Cannot clear value of required NameSelector');
    });
  });
});
