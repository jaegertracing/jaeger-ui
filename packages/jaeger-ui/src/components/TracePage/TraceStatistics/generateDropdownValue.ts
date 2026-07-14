// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _uniq from 'lodash/uniq';
import { IOtelTrace } from '../../../types/otel';

import { getServiceName, getOperationName } from './tableValues';

/**
 * Used to get the values if attribute is picked from the first dropdown.
 */
function getValueAttributeIsPicked(
  trace: IOtelTrace,
  attributeKeyFromFirstDropdown: string,
  useOtelTerms: boolean
) {
  const allSpans = trace.spans;
  const attributeKeys = new Set<string>();

  for (let j = 0; j < allSpans.length; j++) {
    if (allSpans[j].attributes.has(attributeKeyFromFirstDropdown)) {
      allSpans[j].attributes.keys().forEach(key => attributeKeys.add(key));
    }
  }

  attributeKeys.delete(attributeKeyFromFirstDropdown);

  return [getServiceName(), getOperationName(useOtelTerms), ...attributeKeys];
}

/**
 * Used to get the values if no attribute is picked from the first dropdown.
 */
function getValueNoAttributeIsPicked(trace: IOtelTrace, nameSelectorTitle: string, useOtelTerms: boolean) {
  const availableAttributes = [];
  const allSpans = trace.spans;
  const serviceName = getServiceName();
  const operationName = getOperationName(useOtelTerms);

  if (nameSelectorTitle === serviceName) {
    availableAttributes.push(operationName);
  } else {
    availableAttributes.push(serviceName);
  }
  for (let i = 0; i < allSpans.length; i++) {
    availableAttributes.push(...allSpans[i].attributes.keys());
  }
  return _uniq(availableAttributes);
}

export function generateDropdownValue(trace: IOtelTrace, useOtelTerms: boolean) {
  const allSpans = trace.spans;
  const attributeKeys = _uniq(allSpans.flatMap(o => o.attributes.keys()));
  const values = [getServiceName(), getOperationName(useOtelTerms), ...attributeKeys];
  return values;
}

export function generateSecondDropdownValue(
  trace: IOtelTrace,
  dropdownTitle1: string,
  useOtelTerms: boolean
) {
  let values;
  const serviceName = getServiceName();
  const operationName = getOperationName(useOtelTerms);

  if (dropdownTitle1 !== serviceName && dropdownTitle1 !== operationName) {
    values = getValueAttributeIsPicked(trace, dropdownTitle1, useOtelTerms);
  } else {
    values = getValueNoAttributeIsPicked(trace, dropdownTitle1, useOtelTerms);
  }
  return values;
}
