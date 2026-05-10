// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// Test helper — defined in test/vitest-setup.ts, available in all test files.
declare function mockDefault<T>(mod: T): { default: T };

declare interface Window {
  // For setting the site-prefix
  __webpack_public_path__: string;
  // For getting ui config
  getJaegerUiConfig?: () => Record<string, any>;
  getJaegerStorageCapabilities?: () => Record<string, any>;
  getJaegerVersion?: () => Record<string, any>;
}

declare const __REACT_APP_GA_DEBUG__: string | undefined;
declare const __REACT_APP_VSN_STATE__: string | undefined;
declare const __APP_ENVIRONMENT__: string | undefined;

declare module 'combokeys' {
  export default class Combokeys {
    constructor(element: HTMLElement);
    bind: (binding: string | string[], handler: CombokeysHandler) => void;
    reset: () => void;
  }
}

declare module 'json-markup';
declare module 'tween-functions';
declare module 'chance';
declare module 'isomorphic-fetch';
declare module '*.png' {
  export default '' as string;
}

// Vite alias – TypeScript path resolution for the plexus demo entry point.
// The @jaegertracing/plexus/demo alias is configured in vite.config.mts;
// declare the module here so tsc-lint can resolve it.
declare module '@jaegertracing/plexus/demo' {
  import type { ComponentType } from 'react';
  const Demo: ComponentType<Record<string, never>>;
  export default Demo;
}
