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
import '@testing-library/jest-dom';

import { UnconnectedTraceDiffGraph as TraceDiffGraph } from './TraceDiffGraph';
import { fetchedState } from '../../../constants';

jest.mock('../../common/UiFindInput', () => props => (
  <div data-testid="ui-find-input" {...props.inputProps}>
    UiFindInput {props.inputProps?.suffix}
  </div>
));
jest.mock('../../common/ErrorMessage', () => props => <div data-testid="error-message">{props.error}</div>);
jest.mock('../../common/LoadingIndicator', () => () => <div data-testid="loading-indicator">Loading...</div>);

afterEach(cleanup);

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

  it('renders warning when a or b are not provided', () => {
    const { rerender } = render(<TraceDiffGraph {...baseProps} />);
    expect(screen.queryByText('At least two Traces are needed')).not.toBeInTheDocument();

    rerender(<TraceDiffGraph {...baseProps} a={undefined} />);
    expect(screen.getByText('At least two Traces are needed')).toBeInTheDocument();

    rerender(<TraceDiffGraph {...baseProps} b={undefined} />);
    expect(screen.getByText('At least two Traces are needed')).toBeInTheDocument();
  });

  it('renders error message when a or b have errors', () => {
    const { rerender } = render(<TraceDiffGraph {...baseProps} />);

    expect(screen.queryAllByTestId('error-message')).toHaveLength(0);

    const errorA = 'trace a error';
    rerender(<TraceDiffGraph {...baseProps} a={{ ...baseProps.a, error: errorA }} />);
    expect(screen.getAllByTestId('error-message')).toHaveLength(1);
    expect(screen.getByText(errorA)).toBeInTheDocument();

    const errorB = 'trace b error';
    rerender(
      <TraceDiffGraph
        {...baseProps}
        a={{ ...baseProps.a, error: errorA }}
        b={{ ...baseProps.b, error: errorB }}
      />
    );
    expect(screen.getAllByTestId('error-message')).toHaveLength(2);
    expect(screen.getByText(errorB)).toBeInTheDocument();
  });

  it('shows loading when a or b are loading', () => {
    const { rerender } = render(
      <TraceDiffGraph {...baseProps} a={{ ...baseProps.a, state: fetchedState.LOADING }} />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    rerender(<TraceDiffGraph {...baseProps} b={{ ...baseProps.b, state: fetchedState.LOADING }} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders an empty graph wrapper when data is missing', () => {
    const { container, rerender } = render(
      <TraceDiffGraph {...baseProps} a={{ ...baseProps.a, data: undefined }} />
    );
    expect(container.querySelector('.TraceDiffGraph--graphWrapper').innerHTML).toBe('');

    rerender(<TraceDiffGraph {...baseProps} b={{ ...baseProps.b, data: undefined }} />);
    expect(container.querySelector('.TraceDiffGraph--graphWrapper').innerHTML).toBe('');
  });

  it('renders graph when data is present', () => {
    const { container } = render(<TraceDiffGraph {...baseProps} />);
    const graphWrapper = container.querySelector('.TraceDiffGraph--graphWrapper');
    const dag = container.querySelector('.TraceDiffGraph--dag');
    const minimap = container.querySelector('.u-miniMap');

    expect(graphWrapper).toBeInTheDocument();
    expect(dag).toBeInTheDocument();
    expect(minimap).toBeInTheDocument();
  });

  it('renders uiFind input with count suffix', () => {
    const { getByTestId, rerender } = render(<TraceDiffGraph {...baseProps} />);
    expect(getByTestId('ui-find-input')).not.toHaveAttribute('suffix');

    rerender(<TraceDiffGraph {...baseProps} uiFind="test uiFind" />);
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

    render(<TraceDiffGraph a={matchedTrace} b={matchedTrace} uiFind="GET" />);
    expect(screen.getByTestId('ui-find-input')).toHaveAttribute('suffix', '1');
  });
});
