// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { create } from 'zustand';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createStoreConnector } from './zustand-class-bridge';

type TCounter = {
  count: number;
  inc: () => void;
};

const useCounterStore = create<TCounter>(set => ({
  count: 0,
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
  it('injects Zustand state into a class component and updates on store change', async () => {
    useCounterStore.setState({ count: 0 });
    const user = userEvent.setup();

    render(<ConnectedCounter />);

    expect(screen.getByRole('button')).toHaveTextContent('count:0');

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('count:1');
  });
});
