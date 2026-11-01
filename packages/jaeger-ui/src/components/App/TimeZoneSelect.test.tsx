// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import TimeZoneProvider from './TimeZoneProvider';
import TimeZoneSelect from './TimeZoneSelect';
import { TIME_ZONE_STORAGE_KEY } from './TimeZoneStorage';
import { formatDatetime, getDisplayTimeZone, setDisplayTimeZone } from '../../utils/date';

const BROWSER_LABEL = `Browser time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;

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
  });

  afterEach(() => {
    setDisplayTimeZone('browser');
  });

  it('uses browser time by default', () => {
    renderSelect();
    expect(getDisplayTimeZone()).toBeNull();
  });

  it('offers only browser time and UTC', async () => {
    renderSelect();
    fireEvent.click(screen.getByRole('button', { name: /select time zone/i }));
    expect(await screen.findByText(BROWSER_LABEL)).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('switches to UTC, re-renders timestamps, and remembers the choice', async () => {
    renderSelect();

    await choose('UTC');

    expect(getDisplayTimeZone()).toBe('UTC');
    expect(screen.getByRole('button', { name: /select time zone/i })).toHaveTextContent('UTC');
    expect(screen.getByTestId('timestamp')).toHaveTextContent('January 1 1970, 00:00:00.000');
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"utc"');
  });

  it('switches back to browser time', async () => {
    localStorage.setItem(TIME_ZONE_STORAGE_KEY, '"utc"');
    renderSelect();
    expect(getDisplayTimeZone()).toBe('UTC');

    await choose(BROWSER_LABEL);

    expect(getDisplayTimeZone()).toBeNull();
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"browser"');
  });
});
