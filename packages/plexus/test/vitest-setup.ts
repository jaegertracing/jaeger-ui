// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';
import { TextEncoder } from 'util';
import '@testing-library/jest-dom/vitest';

global.TextEncoder = TextEncoder as typeof global.TextEncoder;

// Alias jest → vi so existing test files work without modification.
// Note: jest.mock() calls are NOT covered by this alias — they require
// vi.mock() to be hoisted by Vitest's transform. See test files that use
// jest.mock() for the current state.
(global as any).jest = vi;
