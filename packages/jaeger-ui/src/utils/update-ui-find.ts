// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';
import { NavigateFunction, Location } from 'react-router-dom';

import { TNil } from '../types';

export default function updateUiFind({
  navigate,
  location,
  trackFindFunction,
  uiFind,
}: {
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
  }
}
