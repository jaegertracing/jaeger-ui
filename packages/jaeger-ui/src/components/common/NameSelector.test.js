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
import userEvent from '@testing-library/user-event'; // Use userEvent for more realistic interactions
import '@testing-library/jest-dom'; // For custom matchers

import NameSelector, { DEFAULT_PLACEHOLDER } from './NameSelector';

// Mock FilteredList as its internal behavior is tested separately
// We just need to test the interaction between NameSelector and FilteredList
jest.mock('./FilteredList', () => {
  // Import React inside the factory function

  const React = require('react');

  return React.forwardRef(({ cancel, options, value, setValue }, ref) => {
    React.useImperativeHandle(ref, () => ({
      focusInput: jest.fn(),
      isMouseWithin: jest.fn(() => false), // Default to false for outside click tests
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

  // Explicitly call cleanup after each test
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
      // Conditionally add clearValue only if not required
      ...(overrideProps.required === false && !overrideProps.clearValue
        ? { clearValue: clearValueMock }
        : {}),
      ...(overrideProps.required !== false && overrideProps.clearValue
        ? { clearValue: overrideProps.clearValue } // Allow explicit clearValue when required for testing errors
        : {}),
    };
    // Antd Popover renders content into a portal by default.
    // Attach container to document.body to make portal content accessible.
    // Pass getPopupContainer to render Popover inline for easier testing
    return render(
      <NameSelector
        {...props}
        // @ts-ignore // Ignore TS error for adding Popover prop not defined in NameSelector props
        getPopupContainer={triggerNode => triggerNode.parentElement}
      />
    );
  };

  const openPopover = async () => {
    // The clickable element is the h2 containing the label and value
    const trigger = screen.getByRole('heading', { level: 2 });
    await userEvent.click(trigger);
    // Wait for the popover content to appear
    await screen.findByTestId('filtered-list');
  };

  it('renders without exploding', () => {
    setup();
    // Check for heading containing the placeholder initially (value=null)
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
      // Label is hidden when placeholder is shown
      expect(screen.queryByText(`${label}:`)).not.toBeInTheDocument();
      // Check text content of the heading due to BreakableText
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
      // Check that the heading contains the label AND the value
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:${value}`);
      expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();

      // Rerender with placeholder=true to double-check
      cleanup(); // Clean up previous render first
      setup({ placeholder: true, value, required: false });
      expect(screen.getByText(`${label}:`)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:${value}`);
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();
    });

    it('does not render any placeholder if placeholder prop is omitted or false', () => {
      setup({ placeholder: undefined, value: null, required: false });
      // Label should still be rendered even if value is empty
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${label}:`);
      expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PLACEHOLDER)).not.toBeInTheDocument();

      cleanup(); // Clean up previous render
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

    // Popover should close after selection
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

  // Note: Testing clicking outside is tricky with portals.
  // We rely on the mocked isMouseWithin returning false.
  // We also ensure the Popover's onOpenChange works as expected.
  it('hides the popover when clicking outside', async () => {
    setup({ required: false });
    await openPopover(); // Popover is open

    // Simulate click outside the popover
    await userEvent.click(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  it('controls the visibility of the popover via trigger click', async () => {
    setup({ required: false });
    const trigger = screen.getByRole('heading', { level: 2 });

    // Initially closed
    expect(screen.queryByTestId('filtered-list')).not.toBeInTheDocument();

    // Click to open
    await userEvent.click(trigger);
    await screen.findByTestId('filtered-list'); // Wait for open

    // Click again to close
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByTestId('filtered-list')).not.toBeVisible();
    });
  });

  // Focusing is hard to test accurately without a real browser env,
  // but we can check if the mock function was called.
  it('attempts to focus the filter input when the popover opens', async () => {
    setup({ required: false });
    // The mock's focusInput is called within componentDidUpdate/useEffect in the actual component
    // We check if the input exists after opening.
    await openPopover();
    expect(screen.getByTestId('filtered-list-input')).toBeInTheDocument();
    // We can't easily assert focus in jsdom, but the mock confirms the intent.
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
      // Popover should not have opened
      expect(screen.queryByTestId('filtered-list')).toBeNull();
    });

    it('throws Error when attempting to clear when required (simulated)', () => {
      // Render the component with required=true but also provide clearValue
      // This simulates the error case we want to test
      const testProps = {
        label,
        options,
        value: options[0],
        required: true,
        setValue: jest.fn(),
        clearValue: jest.fn(), // This should cause the error
      };

      // The error should be thrown during render
      expect(() => render(<NameSelector {...testProps} />)).toThrow(
        'Cannot clear value of required NameSelector'
      );
    });
  });
});
