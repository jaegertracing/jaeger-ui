// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Exports createStoreConnector: injects Zustand state into legacy class components
// (hooks only work in function components). The connector is a function component
// that uses useStoreWithEqualityFn + shallow so React integrates with the store
// correctly and re-renders only when the selected slice changes.

import React from 'react';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { StoreApi, UseBoundStore } from 'zustand';

// createStoreConnector allows to inject Zustand state into legacy class components
// (hooks only work in function components). The connector is a function component
// that uses useStoreWithEqualityFn + shallow so React integrates with the store
// correctly and re-renders only when the selected slice changes.
export function createStoreConnector<T, P extends Record<string, unknown>>(
  boundStore: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => P
) {
  return function withStore<C extends React.ComponentType<P & Record<string, unknown>>>(
    Component: C
  ): React.ComponentType<Omit<React.ComponentProps<C>, keyof P>> {
    const Wrapped = Component as React.ComponentType<Record<string, unknown>>;

    function StoreConnector(props: Omit<React.ComponentProps<C>, keyof P>) {
      const slice = useStoreWithEqualityFn(boundStore, selector, shallow);
      return <Wrapped {...(props as Record<string, unknown>)} {...slice} />;
    }

    const name = Wrapped.displayName || Wrapped.name || 'Component';
    StoreConnector.displayName = `WithStore(${name})`;

    return StoreConnector as React.ComponentType<Omit<React.ComponentProps<C>, keyof P>>;
  };
}
