// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { trackEvent } from '../../../../utils/tracking';

const SPM_CATEGORY_BASE = 'jaeger/ux/trace/spm';
export const CATEGORY_VIEW_TRACES = `${SPM_CATEGORY_BASE}/view-traces`;
export const CATEGORY_SORT_OPERATIONS = `${SPM_CATEGORY_BASE}/sort-operations`;

export const trackViewTraces = (name: string) => trackEvent(CATEGORY_VIEW_TRACES, name);
export const trackSortOperations = (columnName: string) => trackEvent(CATEGORY_SORT_OPERATIONS, columnName);
