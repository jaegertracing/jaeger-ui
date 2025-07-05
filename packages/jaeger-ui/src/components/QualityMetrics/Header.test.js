// Copyright (c) 2020 Uber Technologies, Inc.
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
import debounceMock from 'lodash/debounce';

import Header from './Header';

jest.mock('lodash/debounce');

describe('Header', () => {
  const lookback = 4;
  const minProps = {
    lookback,
    setLookback: jest.fn(),
    setService: jest.fn(),
  };
  const service = 'test service';
  const props = {
    ...minProps,
    service,
    services: ['foo', 'bar', 'baz'],
  };
  let callDebouncedFn;
  let setLookbackSpy;

  beforeAll(() => {
    debounceMock.mockImplementation(fn => {
      setLookbackSpy = jest.fn((...args) => {
        callDebouncedFn = () => fn(...args);
      });
      setLookbackSpy.cancel = jest.fn();
      return setLookbackSpy;
    });
  });

  beforeEach(() => {
    props.setLookback.mockReset();
    if (setLookbackSpy) {
      setLookbackSpy.mockClear();
      setLookbackSpy.cancel.mockClear();
    }
    setLookbackSpy = undefined;
  });

  describe('rendering', () => {
    it('renders as expected with minimum props', () => {
      render(<Header {...minProps} />);
      expect(screen.getByLabelText(/lookback/i)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getByText(/in hours/i)).toBeInTheDocument();
    });

    it('renders as expected with full props', () => {
      render(<Header {...props} />);
      expect(screen.getByLabelText(/lookback/i)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getByText(/in hours/i)).toBeInTheDocument();
      expect(screen.getByText(/Service:/i)).toBeInTheDocument();
    });

    it('renders props.lookback when state.ownInputValue is `undefined`', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe(String(lookback));
    });

    it('renders state.ownInputValue when it is not `undefined` regardless of props.lookback', () => {
      const { rerender } = render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');

      // This simulates a user typing "27" into the input.
      const userInput = '27';
      fireEvent.change(input, { target: { value: userInput } });

      // This verifies the component is displaying its internal state.
      expect(input.value).toBe(userInput);

      // This simulates the parent component passing down new data.
      rerender(<Header {...props} lookback={999} />);

      // The component should prioritize the user's active input (its internal state)
      // over the new prop. We assert the input still shows the user's value,
      // confirming that the component's state takes precedence.
      expect(input.value).toBe(userInput);
    });

    it('prioritizes user input over props.lookback (state.ownInputValue precedence)', () => {
      const { rerender } = render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');

      // Initially shows props.lookback (state.ownInputValue is null)
      expect(input.value).toBe(String(props.lookback));

      // User input sets state.ownInputValue
      const userInput = '27';
      fireEvent.change(input, { target: { value: userInput } });
      expect(input.value).toBe(userInput);

      // Changing props.lookback doesn't affect display (state.ownInputValue has precedence)
      const newLookback = 999;
      rerender(<Header {...props} lookback={newLookback} />);
      expect(input.value).toBe(userInput); // Proves state.ownInputValue is being used

      // Additional verification: changing back to original props still shows state value
      rerender(<Header {...props} />);
      expect(input.value).toBe(userInput);
    });
  });

  describe('setting lookback', () => {
    it('no-ops for string values', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');

      // Simulate entering a string value (which should be a no-op for internal state)
      fireEvent.change(input, { target: { value: 'foo' } });

      // Assert that the debounced function was NOT called, which is the correct behavior.
      expect(setLookbackSpy).not.toHaveBeenCalled();
    });

    it('updates state with numeric value, then clears state and calls props.setLookback after debounce', () => {
      const setLookbackPropSpy = jest.fn();
      const { rerender } = render(<Header {...props} setLookback={setLookbackPropSpy} />);
      const input = screen.getByRole('spinbutton');

      // User types a value, which is immediately displayed (verifies state precedence)
      fireEvent.change(input, { target: { value: '42' } });
      expect(input.value).toBe('42');

      // Props change, but input still shows user value (re-verifies state precedence)
      rerender(<Header {...props} lookback={999} setLookback={setLookbackPropSpy} />);
      expect(input.value).toBe('42');

      // Debounced function hasn't been called yet, so prop is not yet called
      expect(setLookbackPropSpy).not.toHaveBeenCalled();

      // Trigger debounced function
      callDebouncedFn();

      // Verify setLookback prop was called with the correct numeric value
      expect(setLookbackPropSpy).toHaveBeenCalledWith(42);

      // After debounce, internal state is cleared, so new props should now be displayed
      rerender(<Header {...props} lookback={999} setLookback={setLookbackPropSpy} />);
      expect(input.value).toBe('999');
    });
  });
});
