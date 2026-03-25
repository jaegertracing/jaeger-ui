// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { create } from 'zustand';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createStoreConnector } from './zustand-class-bridge';

type TCounter = {
  count: number;
  inc: () => void;
  noise: number;
};

const useCounterStore = create<TCounter>(set => ({
  count: 0,
  noise: 0,
  inc: () => set(s => ({ count: s.count + 1 })),
}));

type TCounterProps = {
  count: number;
  inc: () => void;
};

class CounterDisplay extends React.Component<TCounterProps> {
  render() {
    const { count, inc } = this.props;
    return (
      <button type="button" onClick={inc}>
        count:{count}
      </button>
    );
  }
}

const ConnectedCounter = createStoreConnector(useCounterStore, s => ({
  count: s.count,
  inc: s.inc,
}))(CounterDisplay);

describe('createStoreConnector', () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0, noise: 0 });
  });

  it('injects Zustand state into a class component and updates on store change', async () => {
    const user = userEvent.setup();

    render(<ConnectedCounter />);

    expect(screen.getByRole('button')).toHaveTextContent('count:0');

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('count:1');
  });

  it('does not re-render the child when an unrelated store field changes', () => {
    const renderSpy = jest.fn();
    class SpyCounter extends React.Component<TCounterProps> {
      render() {
        renderSpy();
        const { count, inc } = this.props;
        return (
          <button type="button" onClick={inc}>
            count:{count}
          </button>
        );
      }
    }

    const ConnectedSpy = createStoreConnector(useCounterStore, s => ({
      count: s.count,
      inc: s.inc,
    }))(SpyCounter);

    render(<ConnectedSpy />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useCounterStore.setState({ noise: 1 });
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      useCounterStore.setState({ count: 2 });
    });
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
