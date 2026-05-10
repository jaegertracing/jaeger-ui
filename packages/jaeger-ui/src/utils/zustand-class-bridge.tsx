// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * A Higher-Order Component (HOC) factory that bridges Zustand state to legacy
 * class components by injecting selected state slices as props.
 *
 * This utility allows incremental migration from Redux to Zustand without
 * refactoring existing class components into functional components.
 *
 * @template T - The full state type of the Zustand store.
 * @template P - The type of the props being injected (the 'slice').
 *
 * @param boundStore - The Zustand store hook (e.g., `useTraceStore`).
 * @param selector - A function to pick specific state properties and map them to props.
 *
 * @returns An HOC that wraps a component and injects the selected state.
 *
 * @example
 * // 1. Create a specific connector
 * const connect = createStoreConnector(useAppStore, (state) => ({
 *   services: state.services,
 *   loading: state.loading,
 * }));
 *
 * // 2. Apply it to a class component
 * class ServiceList extends React.Component<P & MyOtherProps> { ... }
 * export default connect(ServiceList);
 */
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
