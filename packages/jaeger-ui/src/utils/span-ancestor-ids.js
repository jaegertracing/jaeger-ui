// @flow

// Copyright (c) 2019 Uber Technologies, Inc.
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

import _map from 'lodash/map';

import type { Span } from '../types/trace';

export default function spanAncestorIds(span: ?Span): string[] {
  const ancestors: Span[] = _map(span && span.references, 'span');
  for (let i = 0; i < ancestors.length; i++) {
    ancestors.push(..._map(ancestors[i].references, 'span'));
  }
  return Array.from(new Set(_map(ancestors, 'spanID')));
}
