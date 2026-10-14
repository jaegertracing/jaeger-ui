// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { getInitialTimeZone, writeStoredTimeZone } from './TimeZoneStorage';
import { BROWSER_TIME_ZONE, setDisplayTimeZone } from '../../utils/date';

type TimeZoneContextValue = {
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
};

const TimeZoneContext = createContext<TimeZoneContextValue>({
  timeZone: BROWSER_TIME_ZONE,
  setTimeZone: () => undefined,
});

export function useTimeZone() {
  return useContext(TimeZoneContext);
}

export default function TimeZoneProvider({ children }: { children: React.ReactNode }) {
  const [timeZone, setTimeZoneState] = useState<string>(() => {
    const initial = getInitialTimeZone();
    setDisplayTimeZone(initial);
    return initial;
  });

  const setTimeZone = useCallback((value: string) => {
    setDisplayTimeZone(value);
    writeStoredTimeZone(value);
    setTimeZoneState(value);
  }, []);

  const value = useMemo(() => ({ timeZone, setTimeZone }), [timeZone, setTimeZone]);

  // Timestamps are formatted by plain functions inside memoized components, so
  // remount the tree when the zone changes to re-render every one of them.
  // Data lives in the stores, so only transient UI state is reset.
  return (
    <TimeZoneContext.Provider value={value}>
      <React.Fragment key={timeZone}>{children}</React.Fragment>
    </TimeZoneContext.Provider>
  );
}
