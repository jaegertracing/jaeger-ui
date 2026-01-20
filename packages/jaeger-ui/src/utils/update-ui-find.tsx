// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import { History as RouterHistory, Location } from 'history';

import { TNil } from '../types';

export default function updateUiFind({
  history,
  location,
  trackFindFunction,
  uiFind,
}: {
  history: RouterHistory;
  location: Location;
  trackFindFunction?: (uiFind: string | TNil) => void;
  uiFind?: string | TNil;
}) {
  const { uiFind: _oldUiFind, ...queryParams } = queryString.parse(location.search);
  if (trackFindFunction) trackFindFunction(uiFind);
  if (uiFind) (queryParams as Record<string, string>).uiFind = uiFind;
  history.replace({
    ...location,
    search: `?${queryString.stringify(queryParams)}`,
  });
}
