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
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import Header from './index';
import * as track from '../index.track';

jest.mock('./HopsSelector', () => {
  const mockReact = jest.requireActual('react');
  return function MockHopsSelector(props) {
    return mockReact.createElement('div', { 'data-testid': 'hops-selector', ...props });
  };
});

jest.mock('../../common/NameSelector', () => {
  const mockReact = jest.requireActual('react');
  return function MockNameSelector(props) {
    const { label, value, setValue, clearValue, placeholder, options = [] } = props;
    return mockReact.createElement(
      'div',
      { 'data-testid': `name-selector-${label.toLowerCase()}` },
      mockReact.createElement('label', null, label),
      mockReact.createElement(
        'select',
        {
          value: value || '',
          onChange: e => {
            if (setValue) {
              setValue(e.target.value);
            }
          },
          'data-testid': `${label.toLowerCase()}-select`,
        },
        mockReact.createElement('option', { value: '' }, placeholder),
        options.map(option => mockReact.createElement('option', { key: option, value: option }, option))
      ),
      clearValue &&
        mockReact.createElement(
          'button',
          { onClick: clearValue, 'data-testid': `clear-${label.toLowerCase()}` },
          'Clear'
        )
    );
  };
});

jest.mock('./LayoutSettings', () => {
  const mockReact = jest.requireActual('react');
  return function MockLayoutSettings(props) {
    return mockReact.createElement('div', { 'data-testid': 'layout-settings', ...props });
  };
});

jest.mock('../../common/UiFindInput', () => {
  const mockReact = jest.requireActual('react');
  return function MockUiFindInput(props) {
    const inputRef = mockReact.useRef(null);

    mockReact.useEffect(() => {
      if (props.forwardedRef) {
        props.forwardedRef.current = {
          focus: () => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          },
          blur: () => {
            if (inputRef.current) {
              inputRef.current.blur();
            }
          },
          select: () => {
            if (inputRef.current) {
              inputRef.current.select();
            }
          },
          input: inputRef.current,
        };
      }
    });

    return mockReact.createElement('input', {
      ref: inputRef,
      'data-testid': 'ui-find-input',
      ...props.inputProps,
    });
  };
});

describe('<Header>', () => {
  const minProps = {
    clearOperation: () => {},
    setDistance: () => {},
    setOperation: jest.fn(),
    setService: () => {},
  };
  const service = 'testService';
  const services = [service];
  const operation = 'testOperation';
  const operations = [operation, 'test operation'];
  let trackSetOpSpy;

  beforeAll(() => {
    trackSetOpSpy = jest.spyOn(track, 'trackHeaderSetOperation');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders with minimal props', () => {
    render(<Header {...minProps} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('layout-settings')).toBeInTheDocument();
    expect(screen.getByTestId('ui-find-input')).toBeInTheDocument();
  });

  it('omits the operation selector if a service is not selected', () => {
    render(<Header {...minProps} />);

    const nameSelectors = screen.getAllByTestId(/name-selector-/);
    expect(nameSelectors).toHaveLength(1);
    expect(screen.getByTestId('name-selector-service')).toBeInTheDocument();
    expect(screen.queryByTestId('name-selector-operation')).not.toBeInTheDocument();
  });

  it('renders the operation selector iff a service is selected', () => {
    const { rerender } = render(<Header {...minProps} />);

    let nameSelectors = screen.getAllByTestId(/name-selector-/);
    expect(nameSelectors).toHaveLength(1);

    rerender(<Header {...minProps} service={service} services={services} />);
    nameSelectors = screen.getAllByTestId(/name-selector-/);
    expect(nameSelectors).toHaveLength(2);
    expect(screen.getByTestId('name-selector-operation')).toBeInTheDocument();

    rerender(
      <Header
        {...minProps}
        service={service}
        services={services}
        operation={operation}
        operations={operations}
      />
    );
    expect(screen.getByDisplayValue(operation)).toBeInTheDocument();
  });

  it('tracks when operation selector sets a value', () => {
    render(<Header {...minProps} service={service} services={services} operations={operations} />);

    const testOp = 'test operation';
    expect(trackSetOpSpy).not.toHaveBeenCalled();

    const operationSelect = screen.getByTestId('operation-select');
    fireEvent.change(operationSelect, { target: { value: testOp } });

    expect(trackSetOpSpy).toHaveBeenCalledTimes(1);
    expect(minProps.setOperation).toHaveBeenCalledWith(testOp);
  });

  it('renders the hops selector if distanceToPathElems is provided', () => {
    render(<Header {...minProps} distanceToPathElems={new Map()} visEncoding="3" />);

    expect(screen.getByTestId('hops-selector')).toBeInTheDocument();
  });

  it('focuses uiFindInput IFF rendered when clicking on wrapping div', () => {
    render(<Header {...minProps} />);

    const uiFindInput = screen.getByTestId('ui-find-input');
    const searchWrapper = screen.getByRole('button');

    fireEvent.click(searchWrapper);
    expect(uiFindInput).toHaveFocus();
  });

  describe('uiFind match information', () => {
    const hiddenUiFindMatches = new Set(['hidden', 'match', 'vertices']);
    const uiFindCount = 20;

    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('renders no info if count is `undefined`', () => {
      render(<Header {...minProps} />);

      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('renders count if `hiddenUiFindMatches` is `undefined` or empty', () => {
      const { rerender } = render(<Header {...minProps} uiFindCount={uiFindCount} />);

      expect(screen.getByText(uiFindCount.toString())).toBeInTheDocument();
      expect(screen.queryByText(hiddenUiFindMatches.size.toString())).not.toBeInTheDocument();

      const matchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(matchButton).toBeDisabled();

      rerender(<Header {...minProps} uiFindCount={uiFindCount} hiddenUiFindMatches={new Set()} />);

      expect(screen.getByText(uiFindCount.toString())).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      const updatedMatchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(updatedMatchButton).toBeDisabled();
    });

    it('renders both visible and hidden counts if both are provided', () => {
      render(<Header {...minProps} hiddenUiFindMatches={hiddenUiFindMatches} uiFindCount={uiFindCount} />);

      expect(screen.getByText(uiFindCount.toString())).toBeInTheDocument();
      expect(screen.getByText(hiddenUiFindMatches.size.toString())).toBeInTheDocument();

      const matchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(matchButton).not.toBeDisabled();
    });

    it('renders 0 with correct tooltip if there are no visible nor hidden matches', () => {
      render(<Header {...minProps} uiFindCount={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      const matchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(matchButton).toBeDisabled();
    });

    it('renders 0 with correct tooltip if there are no matches but there are hidden matches', () => {
      render(<Header {...minProps} uiFindCount={0} hiddenUiFindMatches={hiddenUiFindMatches} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText(hiddenUiFindMatches.size.toString())).toBeInTheDocument();

      const matchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(matchButton).not.toBeDisabled();
    });

    it('renders correct plurality in tooltip', () => {
      const singleHiddenMatch = new Set([Array.from(hiddenUiFindMatches)[0]]);
      render(<Header {...minProps} hiddenUiFindMatches={singleHiddenMatch} uiFindCount={uiFindCount} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calls props.showVertices with vertices in props.hiddenUiFindMatches when clicked with hiddenUiFindMatches', () => {
      const showVertices = jest.fn();

      const { rerender } = render(
        <Header {...minProps} showVertices={showVertices} uiFindCount={uiFindCount} />
      );

      const matchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(matchButton).toBeDisabled();
      fireEvent.click(matchButton);
      expect(showVertices).toHaveBeenCalledTimes(0);

      rerender(
        <Header
          {...minProps}
          showVertices={showVertices}
          uiFindCount={uiFindCount}
          hiddenUiFindMatches={hiddenUiFindMatches}
        />
      );

      const updatedMatchButton = document.querySelector('button.DdgHeader--uiFindInfo');
      expect(updatedMatchButton).not.toBeDisabled();
      fireEvent.click(updatedMatchButton);
      expect(showVertices).toHaveBeenCalledTimes(1);
      expect(showVertices).toHaveBeenCalledWith(Array.from(hiddenUiFindMatches));
    });
  });
});
