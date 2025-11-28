// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _flatten from 'lodash/flatten';
import _uniq from 'lodash/uniq';
import { Trace } from '../../../types/trace';
import { ITableSpan } from './types';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

/**
 * Used to get the values if tag is picked from the first dropdown.
 */
function getValueTagIsPicked(trace: Trace, tagKeyFromFirstDropdown: string) {
  const allSpans = trace.spans;
  const tagKeys = new Set<string>();

  for (let j = 0; j < allSpans.length; j++) {
    let spanContainsTagFromFirstDropdown = false;
    for (let l = 0; l < allSpans[j].tags.length; l++) {
      if (tagKeyFromFirstDropdown === allSpans[j].tags[l].key) {
        spanContainsTagFromFirstDropdown = true;
        break;
      }
    }

    if (spanContainsTagFromFirstDropdown) {
      allSpans[j].tags.forEach(x => tagKeys.add(x.key));
    }
  }

  tagKeys.delete(tagKeyFromFirstDropdown);

  return [serviceName, operationName, ...tagKeys];
}

/**
 * Used to get the values if no tag is picked from the first dropdown.
 */
function getValueNoTagIsPicked(trace: Trace, nameSelectorTitle: string) {
  const availableTags = [];
  const allSpans = trace.spans;
  if (nameSelectorTitle === serviceName) {
    availableTags.push(operationName);
  } else {
    availableTags.push(serviceName);
  }
  for (let i = 0; i < allSpans.length; i++) {
    for (let j = 0; j < allSpans[i].tags.length; j++) {
      availableTags.push(allSpans[i].tags[j].key);
    }
  }
  return _uniq(availableTags);
}

export function generateDropdownValue(trace: Trace) {
  const allSpans = trace.spans;
  const tags = _flatten(allSpans.map(o => o.tags));
  const tagKeys = _uniq(tags.map(o => o.key));
  const values = [serviceName, operationName, ...tagKeys];
  return values;
}

export function generateSecondDropdownValue(trace: Trace, dropdownTitle1: string) {
  let values;
  if (dropdownTitle1 !== serviceName && dropdownTitle1 !== operationName) {
    values = getValueTagIsPicked(trace, dropdownTitle1);
  } else {
    values = getValueNoTagIsPicked(trace, dropdownTitle1);
  }
  return values;
}
