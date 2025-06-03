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

    it('renders props.lookback when state.ownInputValue is `undefined`', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe(String(lookback));
    });

    it('renders state.ownInputValue when it is not `undefined` regardless of props.lookback', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '27' } });
      expect(input.value).toBe('27');
    });
  });

  describe('setting lookback', () => {
    it('no-ops for string values', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'foo' } });
      expect(input.value).toBe('foo');
    });

    it('updates state with numeric value, then clears state and calls props.setLookback after debounce', () => {
      render(<Header {...props} />);
      const input = screen.getByRole('spinbutton');
      const inputNumber = input.closest('.ant-input-number');
      const inputNumberInstance =
        inputNumber && inputNumber[Object.keys(inputNumber).find(k => k.startsWith('__reactFiber$'))];
      const onChange = inputNumberInstance && inputNumberInstance.return.memoizedProps.onChange;
      if (onChange) onChange(42);

      expect(setLookbackSpy).toHaveBeenCalledWith(42);
      expect(props.setLookback).not.toHaveBeenCalled();

      callDebouncedFn();
      expect(props.setLookback).toHaveBeenCalledWith(42);
    });
  });
});
