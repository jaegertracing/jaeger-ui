// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useSelector } from 'react-redux';
import { ReduxState } from '../types';
import { Config } from '../types/config';

/**
 * Custom hook to access application configuration.
 *
 * This hook abstracts away the internal storage mechanism. Currently, it
 * reads from the Redux 'config' slice, but in the future it can be
 * migrated to Zustand or React Context without changing the component API.
 */
export function useConfig(): Config {
  return useSelector((state: ReduxState) => state.config);
}
