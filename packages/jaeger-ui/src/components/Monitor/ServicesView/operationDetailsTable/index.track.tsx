// Copyright (c) 2022 The Jaeger Authors.
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

import { trackEvent } from '../../../../utils/tracking';

const SPM_CATEGORY_BASE = 'jaeger/ux/trace/spm';
export const CATEGORY_VIEW_TRACES = `${SPM_CATEGORY_BASE}/view-traces`;
export const CATEGORY_SORT_OPERATIONS = `${SPM_CATEGORY_BASE}/sort-operations`;

export const trackViewTraces = (name: string) => trackEvent(CATEGORY_VIEW_TRACES, name);
export const trackSortOperations = (columnName: string) => trackEvent(CATEGORY_SORT_OPERATIONS, columnName);
