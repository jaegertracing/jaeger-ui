// Copyright (c) 2017 The Jaeger Authors.
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

const CATEGORY_SPM = 'jaeger/ux/trace/spm';
const ACTION_VIEW_TRACES = 'view-traces';
const ACTION_SORT_OPERATIONS = 'sort-operations';

export const trackViewTraces = (name: string) => trackEvent(CATEGORY_SPM, ACTION_VIEW_TRACES, name);
export const trackSortOperations = (columnName: string) =>
  trackEvent(CATEGORY_SPM, ACTION_SORT_OPERATIONS, columnName);
