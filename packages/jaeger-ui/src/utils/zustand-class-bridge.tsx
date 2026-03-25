// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// What it does: Exports createStoreConnector, a function that wraps a class component
// so it receives props from a Zustand store (by subscribing to the store and re-rendering when it changes).

// Why: React hooks (useStore()) only work in function components.
// Jaeger UI still has class components (e.g. parts of the trace timeline).
// This bridge is the migration path until those are converted to functions.

import React from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

export function createStoreConnector<T, P extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => P
) {
  return function withStore<C extends React.ComponentType<P & Record<string, unknown>>>(
    Component: C
  ): React.ComponentType<Omit<React.ComponentProps<C>, keyof P>> {
    const Wrapped = Component as React.ComponentType<Record<string, unknown>>;

    return class StoreConnector extends React.Component<Omit<React.ComponentProps<C>, keyof P>> {
      private unsubscribe?: () => void;

      state: { slice: P } = {
        slice: selector(useStore.getState()),
      };

      componentDidMount() {
        this.unsubscribe = useStore.subscribe(nextState => {
          this.setState({ slice: selector(nextState) });
        });
      }

      componentWillUnmount() {
        this.unsubscribe?.();
      }

      render() {
        const { slice } = this.state;
        return <Wrapped {...(this.props as Record<string, unknown>)} {...slice} />;
      }
    };
  };
}
