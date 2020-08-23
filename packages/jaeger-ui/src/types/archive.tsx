// Copyright (c) 2017 Uber Technologies, Inc.
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

import { ApiError } from './api-error';

export type LoadingTraceArchive = { isLoading: true };
export type SuccessfulTraceArchive = { isAcknowledged: false; isArchived: true };
export type ErrorTraceArchive = { error: ApiError; isAcknowledged: false; isArchived: false; isError: true };
export type AcknowledgedTraceArchive = Omit<SuccessfulTraceArchive | ErrorTraceArchive, 'isAcknowledged'> & {
  isAcknowledged: true;
};

export type TraceArchive =
  | LoadingTraceArchive
  | SuccessfulTraceArchive
  | ErrorTraceArchive
  | AcknowledgedTraceArchive;

export type TracesArchive = Record<string, TraceArchive>;
