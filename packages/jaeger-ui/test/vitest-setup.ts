// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';
import { TextEncoder } from 'util';
import { polyfill as rafPolyfill } from '../src/utils/test/requestAnimationFrame';
import '@testing-library/jest-dom/vitest';

// react requires requestAnimationFrame polyfill when using jsdom
rafPolyfill();

// TextEncoder is not provided by JSDOM
global.TextEncoder = TextEncoder as typeof global.TextEncoder;

// Alias jest → vi so existing test files work without modification.
// Note: jest.mock() calls are NOT covered by this alias — they are renamed to
// vi.mock() so Vitest's transform can hoist them. See PR H3 for details.
(global as any).jest = vi;

// Ant Design v6 uses ResizeObserver which is not available in jsdom.
// Must use a regular function (not arrow) because it is called with `new`.
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
}) as unknown as typeof ResizeObserver;

// Ant Design v6 uses MessageChannel which is not available in jsdom.
// Must use a regular function (not arrow) because it is called with `new`.
(global as any).MessageChannel = vi.fn().mockImplementation(function () {
  const port1: any = {
    onmessage: null,
    postMessage: vi.fn((data: unknown) => {
      if (port2.onmessage) {
        setTimeout(() => port2.onmessage({ data }), 0);
      }
    }),
    close: vi.fn(),
  };
  const port2: any = {
    onmessage: null,
    postMessage: vi.fn((data: unknown) => {
      if (port1.onmessage) {
        setTimeout(() => port1.onmessage({ data }), 0);
      }
    }),
    close: vi.fn(),
  };
  return { port1, port2 };
});

// Calls to get-config.tsx and get-version.tsx warn if these globals are not functions.
// This file is executed before each test file, so they may be overridden safely.
(window as any).getJaegerUiConfig = () => ({});
(window as any).getJaegerStorageCapabilities = () => ({});
(window as any).getJaegerVersion = () => ({
  gitCommit: '',
  gitVersion: '',
  buildDate: '',
});

// Suppress jsdom "Not implemented" warnings for APIs called by third-party
// code (Ant Design, link components) but never meaningfully exercised in
// unit tests.  window.open is reset per-test so spies work correctly.
window.open = vi.fn();
beforeEach(() => {
  window.open = vi.fn();
});
window.getComputedStyle = new Proxy(window.getComputedStyle, {
  apply(target, thisArg, args) {
    // jsdom logs "Not implemented" when a pseudo-element is passed; swallow it.
    if (args[1]) return { getPropertyValue: () => '' } as CSSStyleDeclaration;
    return Reflect.apply(target, thisArg, args);
  },
});

// Provide a matchMedia() stub as some Ant Design components attempt to use this
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// mockDefault wraps a mock component/function so that vi.mock() factories for default-exported
// modules are ESM-compatible in Vitest.
//
// Under Vitest (native ESM), the factory return value is the module namespace object, so the
// default export must be keyed under `default`. This function does that wrapping.
//
// Under Jest (CommonJS interop), a factory that returns a function directly is treated as the
// module itself, so mockDefault is `mod => mod` in jest-per-test-setup.js.
//
// See docs/adr/0007-vite-plus-migration.md §9 (PR H2c / H3) for details.
(global as any).mockDefault = (mod: unknown) => ({ default: mod });
