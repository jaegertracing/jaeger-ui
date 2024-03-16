// Copyright (c) 2020 Uber Technologies, Inc.
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

import { TPadEntry } from '../model/path-agnostic-decorations/types';

type TPathAgnosticDecorations = Record<
  string,
  {
    withOpMax?: number;
    withoutOpMax?: number;
    withoutOp?: Record<string, TPadEntry>;
    withOp?: Record<string, Record<string, TPadEntry>>;
  }
>;

// eslint-disable-next-line no-undef
export default TPathAgnosticDecorations;
