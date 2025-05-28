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
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { UnconnectedTraceDiffGraph as TraceDiffGraph } from './TraceDiffGraph';
import { fetchedState } from '../../../constants';
import * as getConfig from '../../../utils/config/get-config';

jest.mock('../../common/UiFindInput', () => props => (
  <div data-testid="ui-find-input" {...props.inputProps}>
    UiFindInput {props.inputProps?.suffix}
  </div>
));
jest.mock('../../common/ErrorMessage', () => props => <div data-testid="error-message">{props.error}</div>);
jest.mock('../../common/LoadingIndicator', () => () => <div data-testid="loading-indicator">Loading...</div>);

afterEach(cleanup);

const renderWithRouter = component => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('TraceDiffGraph', () => {
  const baseProps = {
    a: {
      data: {
        spans: [],
        traceID: 'trace-id-a',
      },
      error: null,
      id: 'trace-id-a',
      state: fetchedState.DONE,
    },
    b: {
      data: {
        spans: [],
        traceID: 'trace-id-b',
      },
      error: null,
      id: 'trace-id-b',
      state: fetchedState.DONE,
    },
    uiFind: '',
  };

  let getConfigValueSpy;
  let windowOpenSpy;

  beforeEach(() => {
    getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders warning when a or b are not provided', () => {
    const { rerender } = renderWithRouter(<TraceDiffGraph {...baseProps} />);
    expect(screen.queryByText('At least two Traces are needed')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} a={undefined} />
      </MemoryRouter>
    );
    expect(screen.getByText('At least two Traces are needed')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} b={undefined} />
      </MemoryRouter>
    );
    expect(screen.getByText('At least two Traces are needed')).toBeInTheDocument();
  });

  it('renders error message when a or b have errors', () => {
    const { rerender } = renderWithRouter(<TraceDiffGraph {...baseProps} />);

    expect(screen.queryAllByTestId('error-message')).toHaveLength(0);

    const errorA = 'trace a error';
    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} a={{ ...baseProps.a, error: errorA }} />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('error-message')).toHaveLength(1);
    expect(screen.getByText(errorA)).toBeInTheDocument();

    const errorB = 'trace b error';
    rerender(
      <MemoryRouter>
        <TraceDiffGraph
          {...baseProps}
          a={{ ...baseProps.a, error: errorA }}
          b={{ ...baseProps.b, error: errorB }}
        />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId('error-message')).toHaveLength(2);
    expect(screen.getByText(errorB)).toBeInTheDocument();
  });

  it('shows loading when a or b are loading', () => {
    const { rerender } = renderWithRouter(
      <TraceDiffGraph {...baseProps} a={{ ...baseProps.a, state: fetchedState.LOADING }} />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} b={{ ...baseProps.b, state: fetchedState.LOADING }} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders an empty graph wrapper when data is missing', () => {
    const { container, rerender } = renderWithRouter(
      <TraceDiffGraph {...baseProps} a={{ ...baseProps.a, data: undefined }} />
    );
    expect(container.querySelector('.TraceDiffGraph--graphWrapper').innerHTML).toBe('');

    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} b={{ ...baseProps.b, data: undefined }} />
      </MemoryRouter>
    );
    expect(container.querySelector('.TraceDiffGraph--graphWrapper').innerHTML).toBe('');
  });

  it('renders graph when data is present', () => {
    const { container } = renderWithRouter(<TraceDiffGraph {...baseProps} />);
    const graphWrapper = container.querySelector('.TraceDiffGraph--graphWrapper');
    const dag = container.querySelector('.TraceDiffGraph--dag');
    const minimap = container.querySelector('.u-miniMap');

    expect(graphWrapper).toBeInTheDocument();
    expect(dag).toBeInTheDocument();
    expect(minimap).toBeInTheDocument();
  });

  it('renders uiFind input with count suffix', () => {
    const { getByTestId, rerender } = renderWithRouter(<TraceDiffGraph {...baseProps} />);
    expect(getByTestId('ui-find-input')).not.toHaveAttribute('suffix');

    rerender(
      <MemoryRouter>
        <TraceDiffGraph {...baseProps} uiFind="test uiFind" />
      </MemoryRouter>
    );
    expect(getByTestId('ui-find-input')).toHaveAttribute('suffix', '0');
  });

  it('shows match count when uiFind matches span data', () => {
    const span = {
      spanID: 'abc123',
      operationName: 'GET /api',
      process: { serviceName: 'svc' },
      tags: [],
      logs: [],
    };

    const matchedTrace = {
      data: { spans: [span], traceID: 't-id' },
      error: null,
      id: 't-id',
      state: fetchedState.DONE,
    };

    renderWithRouter(<TraceDiffGraph a={matchedTrace} b={matchedTrace} uiFind="GET" />);
    expect(screen.getByTestId('ui-find-input')).toHaveAttribute('suffix', '1');
  });

  describe('empty state help button', () => {
    it('opens help link when config value exists', () => {
      const helpLink = 'https://example.com/help';

      getConfigValueSpy.mockReturnValue(helpLink);

      const { getByTestId } = renderWithRouter(<TraceDiffGraph {...baseProps} a={undefined} b={undefined} />);
      const helpButton = getByTestId('learn-how-button');
      helpButton.click();

      expect(getConfigValueSpy).toHaveBeenCalledWith('traceDiff.helpLink');
      expect(windowOpenSpy).toHaveBeenCalledWith(helpLink, expect.any(String));
    });

    it('does not open window when help link config is not set', () => {
      getConfigValueSpy.mockReturnValue(null);

      const { getByTestId } = renderWithRouter(<TraceDiffGraph {...baseProps} a={undefined} b={undefined} />);
      const helpButton = getByTestId('learn-how-button');
      helpButton.click();

      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });
});
