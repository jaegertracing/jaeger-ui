// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';
import { NavigateFunction } from 'react-router-dom';
import { History as RouterHistory, Location } from 'history';

import { TNil } from '../types';

export default function updateUiFind({
  history,
  navigate,
  location,
  trackFindFunction,
  uiFind,
}: {
  history?: RouterHistory;
  navigate?: NavigateFunction;
  location: Location;
  trackFindFunction?: (uiFind: string | TNil) => void;
  uiFind?: string | TNil;
}) {
  const { uiFind: _oldUiFind, ...queryParams } = queryString.parse(location.search);
  if (trackFindFunction) trackFindFunction(uiFind);
  if (uiFind) (queryParams as Record<string, string>).uiFind = uiFind;
  if (navigate) {
    navigate(
      { pathname: location.pathname, search: `?${queryString.stringify(queryParams)}` },
      { replace: true }
    );
  } else if (history) {
    history.replace({
      ...location,
      search: `?${queryString.stringify(queryParams)}`,
    });
  }
}
