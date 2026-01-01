// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _flatten from 'lodash/flatten';
import _uniq from 'lodash/uniq';
import { IOtelTrace } from '../../../types/otel';
import { ITableSpan } from './types';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

/**
 * Used to get the values if attribute is picked from the first dropdown.
 */
function getValueAttributeIsPicked(trace: IOtelTrace, attributeKeyFromFirstDropdown: string) {
  const allSpans = trace.spans;
  const attributeKeys = new Set<string>();

  for (let j = 0; j < allSpans.length; j++) {
    let spanContainsAttributeFromFirstDropdown = false;
    for (let l = 0; l < allSpans[j].attributes.length; l++) {
      if (attributeKeyFromFirstDropdown === allSpans[j].attributes[l].key) {
        spanContainsAttributeFromFirstDropdown = true;
        break;
      }
    }

    if (spanContainsAttributeFromFirstDropdown) {
      allSpans[j].attributes.forEach(x => attributeKeys.add(x.key));
    }
  }

  attributeKeys.delete(attributeKeyFromFirstDropdown);

  return [serviceName, operationName, ...attributeKeys];
}

/**
 * Used to get the values if no attribute is picked from the first dropdown.
 */
function getValueNoAttributeIsPicked(trace: IOtelTrace, nameSelectorTitle: string) {
  const availableAttributes = [];
  const allSpans = trace.spans;
  if (nameSelectorTitle === serviceName) {
    availableAttributes.push(operationName);
  } else {
    availableAttributes.push(serviceName);
  }
  for (let i = 0; i < allSpans.length; i++) {
    for (let j = 0; j < allSpans[i].attributes.length; j++) {
      availableAttributes.push(allSpans[i].attributes[j].key);
    }
  }
  return _uniq(availableAttributes);
}

export function generateDropdownValue(trace: IOtelTrace) {
  const allSpans = trace.spans;
  const attributes = _flatten(allSpans.map(o => o.attributes));
  const attributeKeys = _uniq(attributes.map(o => o.key));
  const values = [serviceName, operationName, ...attributeKeys];
  return values;
}

export function generateSecondDropdownValue(trace: IOtelTrace, dropdownTitle1: string) {
  let values;
  if (dropdownTitle1 !== serviceName && dropdownTitle1 !== operationName) {
    values = getValueAttributeIsPicked(trace, dropdownTitle1);
  } else {
    values = getValueNoAttributeIsPicked(trace, dropdownTitle1);
  }
  return values;
}
