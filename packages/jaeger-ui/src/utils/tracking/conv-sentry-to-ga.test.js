// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import convSentryToGa from './conv-sentry-to-ga';
import { SENTRY_PAYLOAD, SENTRY_TO_GA } from './fixtures';

describe('convSentryToGa()', () => {
  it('converts the sentry payload to { category, action, label, value }', () => {
    const data = convSentryToGa(SENTRY_PAYLOAD);
    expect(data).toEqual(SENTRY_TO_GA);
  });
});
