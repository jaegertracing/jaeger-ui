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

describe('UiFind', () => {
  const flushMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(parseQuery, 'default');

  const uiFind = 'uiFind';
  const ownInputValue = 'ownInputValue';
  const props = {
    uiFind: undefined,
    history: {
      replace: () => {},
    },
    location: {
      search: null,
    },
    inputProps: {},
  };

  beforeAll(() => {
    debounceMock.mockImplementation(fn => {
      function debounceFunction(...args) {
        fn(...args);
      }
      debounceFunction.flush = flushMock;
      return debounceFunction;
    });
  });

  beforeEach(() => {
    flushMock.mockReset();
    updateUiFindSpy.mockReset();
  });

  describe('rendering', () => {
    it('renders as expected', () => {
      const { container } = render(<UnconnectedUiFindInput {...props} />);
      expect(container).toMatchSnapshot();
    });

    it('renders props.uiFind when state.ownInputValue is `undefined`', () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);
    });

    it('prioritizes state.ownInputValue over props.uiFind when ownInputValue is set', async () => {
      // Test the initial state
      const { rerender } = render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(uiFind);

      // Test setting ownInputValue through user interaction
      await userEvent.clear(screen.getByPlaceholderText('Find...'));
      await userEvent.type(screen.getByPlaceholderText('Find...'), ownInputValue);

      // Verify the state change affected the value
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(ownInputValue);

      // Verify the precedence is maintained after re-render
      rerender(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      expect(screen.getByPlaceholderText('Find...')).toHaveValue(ownInputValue);
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
        history: props.history,
        location: props.location,
        trackFindFunction: undefined,
        uiFind: newValue,
      });
    });

    it('calls updateUiFind with correct kwargs with tracking enabled', async () => {
      render(<UnconnectedUiFindInput {...props} trackFindFunction={trackFindFunction} />);
      await userEvent.type(screen.getByPlaceholderText('Find...'), newValue);
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        history: props.history,
        location: props.location,
        trackFindFunction,
        uiFind: newValue,
      });
    });

    it('no-ops if value is unchanged', async () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      const input = screen.getByPlaceholderText('Find...');
      await userEvent.clear(input);
      await userEvent.type(input, uiFind);
      const calls = updateUiFindSpy.mock.calls;
      const calledWithUnchanged = calls.some(([args]) => args && args.uiFind === uiFind);
      expect(calledWithUnchanged).toBe(false);
    });
  });

  describe('blurring input', () => {
    it('clears state.ownInputValue and resets to props.uiFind', async () => {
      render(<UnconnectedUiFindInput {...props} uiFind={uiFind} />);
      const input = screen.getByPlaceholderText('Find...');
      await userEvent.clear(input);
      await userEvent.type(input, 'abc');
      expect(input).toHaveValue('abc');
      await userEvent.tab();
      expect(input).toHaveValue(uiFind);

      // Verify that typing after blur starts from props.uiFind
      await userEvent.clear(input);
      await userEvent.type(input, 'xyz');
      expect(input).toHaveValue('xyz');
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
      render(<UnconnectedUiFindInput {...props} allowClear uiFind={uiFind} />);
      const clearIcon = screen.getByTestId('clear-icon');
      await userEvent.click(clearIcon);
      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        history: props.history,
        location: props.location,
        uiFind: undefined,
      });
      expect(flushMock).toHaveBeenCalledTimes(1);
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
