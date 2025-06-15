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
      return setLookbackSpy;
    });
  });

  beforeEach(() => {
    props.setLookback.mockReset();
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

    it('renders props.lookback when component first mounts (ownInputValue is null)', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe(String(lookback));
    });

    it('updates displayed value when props.lookback changes and ownInputValue is null', () => {
      const newLookback = 10;
      const { rerender } = render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');

      rerender(<Header {...props} lookback={newLookback} />);
      expect(input.value).toBe(String(newLookback));
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
    it('maintains previous value when invalid input is entered', () => {
      const setLookbackSpy2 = jest.fn();
      render(<Header {...props} setLookback={setLookbackSpy2} />);
      const input = screen.getByRole('spinbutton');

      // Set a valid value first
      fireEvent.change(input, { target: { value: '25' } });
      expect(input.value).toBe('25');

      // Verify the valid input triggered the debounced function
      callDebouncedFn();
      expect(setLookbackSpy2).toHaveBeenCalledWith(25);
      setLookbackSpy2.mockClear();

      // Try invalid input - InputNumber prevents it and reverts to props.lookback
      fireEvent.change(input, { target: { value: 'foo' } });
      expect(input.value).toBe(String(props.lookback)); // Reverts to initial props.lookback

      // Verify no component logic was triggered for invalid input
      expect(setLookbackSpy2).not.toHaveBeenCalled();

      // Valid input still works
      fireEvent.change(input, { target: { value: '30' } });
      expect(input.value).toBe('30');

      callDebouncedFn();
      expect(setLookbackSpy2).toHaveBeenCalledWith(30);
    });

    it('updates state with numeric value, then clears state and calls props.setLookback after debounce', () => {
      const setLookbackSpy2 = jest.fn();
      const { rerender } = render(<Header {...props} setLookback={setLookbackSpy2} />);

      const input = screen.getByRole('spinbutton');

      // User types a value
      fireEvent.change(input, { target: { value: '42' } });
      expect(input.value).toBe('42');

      // Props change, but input still shows user value (proving state precedence)
      rerender(<Header {...props} lookback={999} setLookback={setLookbackSpy2} />);
      expect(input.value).toBe('42'); // Still shows user input

      // Debounced function hasn't been called yet
      expect(setLookbackSpy2).not.toHaveBeenCalled();

      // Trigger debounced function
      callDebouncedFn();

      // Verify setLookback was called
      expect(setLookbackSpy2).toHaveBeenCalledWith(42);

      // After debounce, state should be cleared, so props should take precedence again
      rerender(<Header {...props} lookback={999} setLookback={setLookbackSpy2} />);
      expect(input.value).toBe('999'); // Now shows props.lookback (state was cleared)
    });
  });
});
