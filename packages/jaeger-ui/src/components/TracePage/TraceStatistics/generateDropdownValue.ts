// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _flatten from 'lodash/flatten';
import _uniq from 'lodash/uniq';
import { IOtelTrace } from '../../../types/otel';
import { ITableSpan } from './types';

const getServiceName = () => 'Service Name';
const getOperationName = (useOtelTerms: boolean) => (useOtelTerms ? 'Span Name' : 'Operation Name');

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
    for (let j = 0; j < allSpans[i].attributes.length; j++) {
      availableAttributes.push(allSpans[i].attributes[j].key);
    }
  }
  return _uniq(availableAttributes);
}

export function generateDropdownValue(trace: IOtelTrace, useOtelTerms: boolean) {
  const allSpans = trace.spans;
  const attributes = _flatten(allSpans.map(o => o.attributes));
  const attributeKeys = _uniq(attributes.map(o => o.key));
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
