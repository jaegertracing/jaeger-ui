// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-empty-object-type */

import { type TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest 5 widened `Assertion` to two type parameters, `<R, T>`, where R is the
// matcher's return type. @testing-library/jest-dom still augments the
// single-parameter `Assertion<T>` that Vitest 4 declared, so its declaration no
// longer merges and every jest-dom matcher loses its type. Re-declare the
// augmentation at the current arity until jest-dom ships a fix
// (https://github.com/testing-library/jest-dom/issues/738).
declare module 'vitest' {
  interface Assertion<R, T> extends TestingLibraryMatchers<any, R> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
