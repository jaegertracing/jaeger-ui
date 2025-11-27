// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// For jest
declare const global: {
  location: Location;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
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
