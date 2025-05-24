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

import { UnconnectedTraceDiffGraph as TraceDiffGraph } from './TraceDiffGraph';
import ErrorMessage from '../../common/ErrorMessage';
import LoadingIndicator from '../../common/LoadingIndicator';
import UiFindInput from '../../common/UiFindInput';
import { fetchedState } from '../../../constants';

describe('TraceDiffGraph', () => {
  const props = {
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
  };
  let rendered;
  beforeEach(() => {
    rendered = render(<TraceDiffGraph {...props} / data-testid="tracediffgraph">));
  });

  it('renders warning when a or b are not provided', () => {
    expect(screen.getAllByTestId('h1')).toHaveLength(0);

    rendered = render({ a: undefined });
    expect(screen.getAllByTestId('h1')).toHaveLength(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');

    rendered = render({ b: undefined });
    expect(screen.getAllByTestId('h1')).toHaveLength(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');

    rendered = render({ a: props.a });
    expect(screen.getAllByTestId('h1')).toHaveLength(1);
    expect(wrapper.find('h1').text()).toBe('At least two Traces are needed');
  });

  it('renders warning when a or b have errored', () => {
    expect(screen.getAllByTestId(ErrorMessage)).toHaveLength(0);

    const errorA = 'some error text for trace a';
    wrapper.setProps({
      a: {
        ...props.a,
        error: errorA,
      },
    });

    expect(screen.getAllByTestId(ErrorMessage)).toHaveLength(1);
    expect(screen.getByTestId(ErrorMessage)).toEqual(
      expect.objectContaining({
        error: errorA,
      })
    );
    const errorB = 'some error text for trace a';
    wrapper.setProps({
      b: {
        ...props.b,
        error: errorB,
      },
    });

    expect(screen.getAllByTestId(ErrorMessage)).toHaveLength(2);
    expect(wrapper.find(ErrorMessage).at(1).props()).toEqual(
      expect.objectContaining({
        error: errorB,
      })
    );
    rendered = render({
      a: props.a,
    });
    expect(screen.getAllByTestId(ErrorMessage)).toHaveLength(1);
    expect(screen.getByTestId(ErrorMessage)).toEqual(
      expect.objectContaining({
        error: errorB,
      })
    );
  });

  it('renders a loading indicator when a or b are loading', () => {
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(0);

    wrapper.setProps({
      a: {
        state: fetchedState.LOADING,
      },
    });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(1);

    wrapper.setProps({
      b: {
        state: fetchedState.LOADING,
      },
    });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(1);

    rendered = render({ a: props.a });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(1);
  });

  it('renders an empty div when a or b lack data', () => {
    expect(wrapper.children().length).not.toBe(0);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const { data: unusedAData, ...aWithoutData } = props.a;
    rendered = render({ a: aWithoutData });
    expect(wrapper.children().length).toBe(0);

    const { data: unusedBData, ...bWithoutData } = props.b;
    rendered = render({ b: bWithoutData });
    expect(wrapper.children().length).toBe(0);

    rendered = render({ a: props.a });
    expect(wrapper.children().length).toBe(0);
  });

  it('renders a DiGraph when it has data', () => {
    expect(container).toMatchSnapshot();
  });

  it('renders current uiFind count when given uiFind', () => {
    expect(wrapper.find(UiFindInput).prop('inputProps')).toEqual(
      expect.objectContaining({
        suffix: undefined,
      })
    );

    rendered = render({ uiFind: 'test uiFind' });

    expect(wrapper.find(UiFindInput).prop('inputProps')).toEqual(
      expect.objectContaining({
        suffix: '0',
      })
    );
  });

  it('cleans up layoutManager before unmounting', () => {
    const layoutManager = jest.spyOn(// RTL doesn't access component instances - use assertions on rendered output instead.layoutManager, 'stopAndRelease');
    wrapper.unmount();
    expect(layoutManager).toHaveBeenCalledTimes(1);
  });
});
