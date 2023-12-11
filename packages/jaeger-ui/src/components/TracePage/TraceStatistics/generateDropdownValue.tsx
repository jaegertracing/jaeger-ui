// Copyright (c) 2020 The Jaeger Authors.
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
import _flatten from 'lodash/flatten';
import _uniq from 'lodash/uniq';
import _concat from 'lodash/concat';
import { Trace } from '../../../types/trace';
import { ITableSpan } from './types';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

/**
 * Used to get the values if tag is picked from the first dropdown.
 */
function getValueTagIsPicked(tableValue: ITableSpan[], trace: Trace, nameSelectorTitle: string) {
  const allSpans = trace.spans;
  let spansWithFilterTag = [];

  // add all Spans with this tag key

  for (let i = 0; i < tableValue.length; i++) {
    if (tableValue[i].hasSubgroupValue) {
      for (let j = 0; j < allSpans.length; j++) {
        for (let l = 0; l < allSpans[j].tags.length; l++) {
          if (nameSelectorTitle === allSpans[j].tags[l].key) {
            spansWithFilterTag.push(allSpans[j]);
          }
        }
      }
    }
  }
  spansWithFilterTag = [...new Set(spansWithFilterTag)];

  const tags = spansWithFilterTag.map(o => o.tags);
  let tagKeys = _uniq(_map(_flatten(tags), 'key'));
  tagKeys = tagKeys.filter(o => o !== nameSelectorTitle);
  spansWithFilterTag = [];
  spansWithFilterTag.push(serviceName);
  spansWithFilterTag.push(operationName);
  spansWithFilterTag = spansWithFilterTag.concat(tagKeys);

  return spansWithFilterTag;
}

/**
 * Used to get the values if no tag is picked from the first dropdown.
 */
function getValueNoTagIsPicked(trace: Trace, nameSelectorTitle: string) {
  let spansWithFilterTag = [];
  const allSpans = trace.spans;
  if (nameSelectorTitle === serviceName) {
    spansWithFilterTag.push(operationName);
  } else {
    spansWithFilterTag.push(serviceName);
  }
  for (let i = 0; i < allSpans.length; i++) {
    for (let j = 0; j < allSpans[i].tags.length; j++) {
      spansWithFilterTag.push(allSpans[i].tags[j].key);
    }
  }
  spansWithFilterTag = [...new Set(spansWithFilterTag)];

  return spansWithFilterTag;
}

export function generateDropdownValue(trace: Trace) {
  const allSpans = trace.spans;
  const tags = _flatten(_map(allSpans, 'tags'));
  const tagKeys = _uniq(_map(tags, 'key'));
  const values = _concat(serviceName, operationName, tagKeys);
  return values;
}

export function generateSecondDropdownValue(tableValue: ITableSpan[], trace: Trace, dropdownTitle1: string) {
  let values;
  if (dropdownTitle1 !== serviceName && dropdownTitle1 !== operationName) {
    values = getValueTagIsPicked(tableValue, trace, dropdownTitle1);
  } else {
    values = getValueNoTagIsPicked(trace, dropdownTitle1);
  }
  return values;
}
