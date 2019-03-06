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

import _filter from 'lodash/filter';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _map from 'lodash/map';

import type { Span } from '../types/trace';

function getFirstAncestor(span: Span): ?Span {
  const referencesWithASpan = _filter(span.references, 'span.spanID');
  const firstAncestorSpan = _find(
    referencesWithASpan,
    ({ refType }) => refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM'
  );
  return _get(firstAncestorSpan, 'span');
}

export default function spanAncestorIds(span: ?Span): string[] {
  if (!span) return [];
  const ancestors: Span[] = [];
  let ref = getFirstAncestor(span);
  while (ref) {
    ancestors.push(ref);
    ref = getFirstAncestor(ref);
  }
  return Array.from(new Set(_map(ancestors, 'spanID')));
}
