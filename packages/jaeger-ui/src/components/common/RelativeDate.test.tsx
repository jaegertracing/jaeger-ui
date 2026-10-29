// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import RelativeDate from './RelativeDate';
import getConfig from '../../utils/config/get-config';
import defaultConfig from '../../constants/default-config';

vi.mock('../../utils/config/get-config', () => ({ default: vi.fn() }));

const value = new Date(2000, 0, 1, 15, 4, 5);

beforeEach(() => {
  vi.mocked(getConfig).mockReturnValue(defaultConfig);
});

it.each([
  ['12h', 'Jan 1, 2000, 3:04:05 pm'],
  ['24h', 'Jan 1, 2000, 15:04:05'],
] as const)('uses the configured %s time suffix', (timeFormat, expected) => {
  vi.mocked(getConfig).mockReturnValue({ ...defaultConfig, timeFormat });
  render(<RelativeDate value={value} includeTime fullMonthName={false} />);

  expect(screen.getByText(expected)).toBeInTheDocument();
});

it('omits the time when includeTime is false', () => {
  render(<RelativeDate value={value} includeTime={false} fullMonthName={false} />);

  expect(screen.getByText('Jan 1, 2000')).toBeInTheDocument();
});
