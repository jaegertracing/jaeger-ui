// Copyright (c) 2023 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with the timezone plugin
dayjs.extend(utc);
dayjs.extend(timezone);

export type TimezoneContextType = {
  timezone: string;
  setTimezone: (timezone: string) => void;
};

// Create a context with a default value
export const TimezoneContext = React.createContext<TimezoneContextType>({
  timezone: 'UTC',
  setTimezone: () => {},
});

// Create a provider component
export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try to guess the user's timezone or default to UTC
  const [timezone, setTimezone] = React.useState<string>(() => {
    try {
      return dayjs.tz.guess() || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  });

  const contextValue = React.useMemo(() => ({ timezone, setTimezone }), [timezone]);

  return <TimezoneContext.Provider value={contextValue}>{children}</TimezoneContext.Provider>;
};

// Custom hook to use the timezone context
export const useTimezone = (): TimezoneContextType => {
  return React.useContext(TimezoneContext);
};