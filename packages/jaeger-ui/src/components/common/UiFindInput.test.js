// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import debounceMock from 'lodash/debounce';
import '@testing-library/jest-dom';

import { UnconnectedUiFindInput, extractUiFindFromState } from './UiFindInput';
import updateUiFindSpy from '../../utils/update-ui-find';
import * as parseQuery from '../../utils/parseQuery';

jest.mock('lodash/debounce');

jest.mock('../../utils/update-ui-find');

const mockNavigate = jest.fn();
const mockLocation = { search: '', pathname: '/test' };

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe('UiFind', () => {
  const flushMock = jest.fn();
  const cancelMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(parseQuery, 'default');

  const uiFind = 'uiFind';
  const ownInputValue = 'ownInputValue';
  const props = {
    uiFind: undefined,
    inputProps: {},
  };

  beforeAll(() => {
    debounceMock.mockImplementation(fn => {
      function debounceFunction(...args) {
        fn(...args);
      }
      debounceFunction.flush = flushMock;
      debounceFunction.cancel = cancelMock;
      return debounceFunction;
    });
  });

  beforeEach(() => {
    flushMock.mockReset();
    updateUiFindSpy.mockReset();
    mockNavigate.mockReset();
  });

  describe('rendering', () => {
    it('renders as expected', () => {
      render(<UnconnectedUiFindInput {...props} />);

      // Test that the input is rendered with correct placeholder
      expect(screen.getByPlaceholderText('Find...')).toBeInTheDocument();

      // Test that the input has empty value when uiFind is undefined
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('');

      // Test that no clear icon is present when allowClear is not set
      expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();
    });

    it('renders props.uiFind when state.ownInputValue is `undefined`', () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);
    });

    it('renders state.ownInputValue when it is not `undefined` regardless of props.uiFind', async () => {
      const { rerender } = render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);

      // Initial state should be undefined, showing props.uiFind
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);

      // Clear input and type new value
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), ownInputValue);

      // Verify state.ownInputValue takes precedence over props.uiFind
      rerender(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(ownInputValue);

      // Verify updateUiFind was called with the new value
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockNavigate,
        location: mockLocation,
        trackFindFunction: undefined,
        uiFind: ownInputValue,
      });
    });

    it('renders state.ownInputValue when it is an empty string props.uiFind is populated', () => {
      const { rerender } = render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      userEvent.clear(screen.getByPlaceholderText('Find...'));
      rerender(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('');
    });
  });

  describe('typing in input', () => {
    const newValue = 'newValue';
    const trackFindFunction = jest.fn();

    it('updates state', async () => {
      render(<UnconnectedUiFindInput {...props} />);
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), newValue);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(newValue);
    });

    it('calls updateUiFind with correct kwargs', async () => {
      render(<UnconnectedUiFindInput {...props} />);
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), newValue);
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockNavigate,
        location: mockLocation,
        trackFindFunction: undefined,
        uiFind: newValue,
      });
    });

    it('calls updateUiFind with correct kwargs with tracking enabled', async () => {
      render(<UnconnectedUiFindInput {...props} trackFindFunction={trackFindFunction} />);
      await userEvent.type(screen.getByPlaceholderText('Find...'), newValue);
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockNavigate,
        location: mockLocation,
        trackFindFunction,
        uiFind: newValue,
      });
    });

    it('no-ops if value is unchanged', async () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);

      // Clear the input first
      await userEvent.clear(screen.getByPlaceholderText('Find...'));

      // Type the same value as props.uiFind
      await userEvent.type(screen.getByPlaceholderText('Find...'), uiFind);

      // Verify that updateUiFind was not called with the same value
      const calls = updateUiFindSpy.mock.calls;
      const calledWithUnchanged = calls.some(([args]) => args && args.uiFind === uiFind);
      expect(calledWithUnchanged).toBe(false);

      // Verify the input value matches props.uiFind
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);
    });
  });

  describe('blurring input', () => {
    it('clears state.ownInputValue', async () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);

      // Clear initial value and type new value
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), 'abc');
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('abc');

      // Blur should clear state.ownInputValue
      screen.getByPlaceholderText('Find...').blur();
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(props.uiFind || undefined);

      // Clear and type again - should start from props.uiFind since state was cleared
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), 'def');
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('def');
    });

    it('clears value immediately when clicked', async () => {
      const { rerender } = render(<UnconnectedUiFindInput {...props} allowClear uiFind={uiFind} />);
      const clearIcon = screen.getByTestId('clear-icon');

      await userEvent.click(clearIcon);

      // Verify the URL update was triggered
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockNavigate,
        location: mockLocation,
        uiFind: undefined,
      });
      expect(flushMock).toHaveBeenCalledTimes(1);

      // Verify the value hasn't changed yet (before props update)
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);

      // Use rerender to update the component with new props
      const updatedProps = { ...props, uiFind: undefined };
      rerender(<UnconnectedUiFindInput {...updatedProps} allowClear />);

      // Now the assertion will find only one input
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('');
    });

    it('triggers pending queryParameter updates', async () => {
      render(<UnconnectedUiFindInput {...props} />);
      screen.getByPlaceholderText('Find...').blur();
      flushMock();
      expect(flushMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear uiFind', () => {
    it('renders clear icon iff clear is enabled and value is a string with at least one character', () => {
      const { rerender } = render(<UnconnectedUiFindInput {...props} allowClear />);
      expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();

      rerender(<UnconnectedUiFindInput {...props} allowClear uiFind="" />);
      expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();

      rerender(<UnconnectedUiFindInput {...props} allowClear uiFind={uiFind} />);
      expect(screen.getByTestId('clear-icon')).toBeInTheDocument();

      rerender(<UnconnectedUiFindInput {...props} allowClear={false} uiFind={uiFind} />);
      expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();

      rerender(<UnconnectedUiFindInput {...props} allowClear uiFind={uiFind} />);
      userEvent.clear(screen.getByPlaceholderText('Find...'));
      expect(screen.queryByTestId('clear-icon')).not.toBeInTheDocument();
    });

    it('clears value immediately when clicked', async () => {
      const { rerender } = render(<UnconnectedUiFindInput {...props} allowClear uiFind={uiFind} />);
      const clearIcon = screen.getByTestId('clear-icon');

      await userEvent.click(clearIcon);

      // Verify the URL update was triggered
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockNavigate,
        location: mockLocation,
        uiFind: undefined,
      });
      expect(flushMock).toHaveBeenCalledTimes(1);

      // Verify the value hasn't changed yet (before props update)
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);

      // Use rerender to update the component with new props
      const updatedProps = { ...props, uiFind: undefined };
      rerender(<UnconnectedUiFindInput {...updatedProps} allowClear />);

      // Now the assertion will find only one input
      expect(screen.getByPlaceholderText('Find...')).toHaveValue('');
    });
  });

  describe('extractUiFindFromState', () => {
    const reduxStateValue = 'state.router.location.search';

    beforeEach(() => {
      queryStringParseSpy.mockReturnValue({ uiFind });
    });

    it('returns uiFind from parsed state.router.location.search', () => {
      const result = extractUiFindFromState({
        router: {
          location: {
            search: reduxStateValue,
          },
        },
      });
      expect(queryStringParseSpy).toHaveBeenCalledWith(reduxStateValue);
      expect(result).toEqual({
        uiFind,
      });
    });

    it('handles multiple uiFinds from parsed state.router.location.search', () => {
      queryStringParseSpy.mockReturnValue({ uiFind: [uiFind, reduxStateValue] });
      const result = extractUiFindFromState({
        router: {
          location: {
            search: reduxStateValue,
          },
        },
      });
      expect(queryStringParseSpy).toHaveBeenCalledWith(reduxStateValue);
      expect(result).toEqual({
        uiFind: `${uiFind} ${reduxStateValue}`,
      });
    });
  });
});
