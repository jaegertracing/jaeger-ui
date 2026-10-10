// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import TimeZoneProvider from './TimeZoneProvider';
import TimeZoneSelect from './TimeZoneSelect';
import { TIME_ZONE_STORAGE_KEY } from './TimeZoneStorage';
import getConfig from '../../utils/config/get-config';
import { formatDatetime, getDisplayTimeZone, setDisplayTimeZone } from '../../utils/date';

vi.mock('../../utils/config/get-config', () => ({
  default: vi.fn(() => ({})),
}));

const getConfigMock = getConfig as unknown as ReturnType<typeof vi.fn>;

function Timestamp() {
  return <span data-testid="timestamp">{formatDatetime(0)}</span>;
}

function renderSelect() {
  return render(
    <TimeZoneProvider>
      <TimeZoneSelect />
      <Timestamp />
    </TimeZoneProvider>
  );
}

async function choose(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /select time zone/i }));
  const item = await screen.findByText(label);
  act(() => {
    fireEvent.click(item);
  });
}

describe('TimeZoneSelect', () => {
  beforeEach(() => {
    localStorage.clear();
    getConfigMock.mockReturnValue({});
  });

  afterEach(() => {
    setDisplayTimeZone('browser');
  });

  it('applies the configured time zone on load', () => {
    getConfigMock.mockReturnValue({ timeZone: 'Asia/Kolkata' });
    renderSelect();
    expect(getDisplayTimeZone()).toBe('Asia/Kolkata');
    expect(screen.getByRole('button', { name: /select time zone/i })).toHaveTextContent('UTC+05:30');
    expect(screen.getByTestId('timestamp')).toHaveTextContent('January 1 1970, 05:30:00.000');
  });

  it('switches to UTC, re-renders timestamps, and remembers the choice', async () => {
    getConfigMock.mockReturnValue({ timeZone: 'Asia/Kolkata' });
    renderSelect();

    await choose('UTC');

    expect(getDisplayTimeZone()).toBe('UTC');
    expect(screen.getByTestId('timestamp')).toHaveTextContent('January 1 1970, 00:00:00.000');
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"utc"');
  });

  it('switches back to the browser time zone', async () => {
    localStorage.setItem(TIME_ZONE_STORAGE_KEY, '"utc"');
    renderSelect();
    expect(getDisplayTimeZone()).toBe('UTC');

    await choose(`Browser time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`);

    expect(getDisplayTimeZone()).toBeNull();
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"browser"');
  });

  it('lists the configured IANA zone as an option', async () => {
    getConfigMock.mockReturnValue({ timeZone: 'Europe/Berlin' });
    renderSelect();
    fireEvent.click(screen.getByRole('button', { name: /select time zone/i }));
    expect(await screen.findByText('Europe/Berlin')).toBeInTheDocument();
  });
});
