// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { IOtelTrace, IOtelSpan } from '../../../types/otel';
import { ITableSpan } from './types';
import colorGenerator from '../../../utils/color-generator';

export const getServiceName = () => 'Service Name';
export const getOperationName = (useOtelTerms: boolean) => (useOtelTerms ? 'Span Name' : 'Operation Name');
export const getAttributeName = (useOtelTerms: boolean) => (useOtelTerms ? 'Attribute' : 'Tag');

function parentChildOfMap(allSpans: ReadonlyArray<IOtelSpan>): Record<string, IOtelSpan[]> {
  const parentChildOfMap: Record<string, IOtelSpan[]> = {};
  allSpans.forEach(s => {
    if (s.parentSpanID) {
      parentChildOfMap[s.parentSpanID] = parentChildOfMap[s.parentSpanID] || [];
      parentChildOfMap[s.parentSpanID].push(s);
    }
  });
  return parentChildOfMap;
}

const memoizedParentChildOfMap = memoizeOne(parentChildOfMap);

function getChildOfSpans(parentID: string, allSpans: ReadonlyArray<IOtelSpan>): IOtelSpan[] {
  return memoizedParentChildOfMap(allSpans)[parentID] || [];
}

function computeSelfTime(parentSpan: IOtelSpan, allSpans: ReadonlyArray<IOtelSpan>): IOtelSpan['duration'] {
  if (!parentSpan.hasChildren) return parentSpan.duration;

  let parentSpanSelfTime = parentSpan.duration;
  let previousChildEndTime = parentSpan.startTime;

  const children = getChildOfSpans(parentSpan.spanID, allSpans).sort((a, b) => a.startTime - b.startTime);

  const parentSpanEndTime = parentSpan.endTime;

  for (let index = 0; index < children.length; index++) {
    const child = children[index];

    const childEndTime = child.endTime;
    const childStartsAfterParentEnded = child.startTime > parentSpanEndTime;
    const childEndsBeforePreviousChild = childEndTime < previousChildEndTime;

    // parent |..................|
    // child    |.......|                     - previousChild
    // child     |.....|                      - childEndsBeforePreviousChild is true, skipped
    // child                         |......| - childStartsAfterParentEnded is true, skipped
    if (childStartsAfterParentEnded || childEndsBeforePreviousChild) {
      continue;
    }

    // parent |.....................|
    // child    |.......|                    - previousChild
    // child        |.....|                  - nonOverlappingStartTime is previousChildEndTime
    // child                |.....|          - nonOverlappingStartTime is child.startTime
    const nonOverlappingStartTime = Math.max(previousChildEndTime, child.startTime);
    const childEndTimeOrParentEndTime = Math.min(parentSpanEndTime, childEndTime);

    const nonOverlappingDuration = childEndTimeOrParentEndTime - nonOverlappingStartTime;
    parentSpanSelfTime = (parentSpanSelfTime - nonOverlappingDuration) as IOtelSpan['duration'];

    // last span which can be included in self time calculation, because it ends after parent span ends
    // parent |.......................|
    // child                      |.....|        - last span included in self time calculation
    // child                       |.........|   - skipped
    if (childEndTimeOrParentEndTime === parentSpanEndTime) {
      break;
    }

    previousChildEndTime = childEndTime as IOtelSpan['duration'];
  }

  return parentSpanSelfTime;
}

function computeColumnValues(
  trace: IOtelTrace,
  span: IOtelSpan,
  allSpans: ReadonlyArray<IOtelSpan>,
  resultValue: StatsPerTag
) {
  const resultValueChange = resultValue;
  resultValueChange.count += 1;
  resultValueChange.total = (resultValueChange.total + span.duration) as IOtelSpan['duration'];
  if (resultValueChange.min > span.duration) {
    resultValueChange.min = span.duration;
  }
  if (resultValueChange.max < span.duration) {
    resultValueChange.max = span.duration;
  }

  const tempSelf = computeSelfTime(span, allSpans);
  if (resultValueChange.selfMin > tempSelf) {
    resultValueChange.selfMin = tempSelf;
  }
  if (resultValueChange.selfMax < tempSelf) {
    resultValueChange.selfMax = tempSelf;
  }
  resultValueChange.selfTotal = (resultValueChange.selfTotal + tempSelf) as IOtelSpan['duration'];

  const onePercent = 100 / trace.duration;
  resultValueChange.percent = resultValueChange.selfTotal * onePercent;

  return resultValueChange;
}

/**
 * Builds an object which represents a column.
 */
function buildOneColumn(oneColumn: ITableSpan) {
  const oneColumnChange = oneColumn;
  oneColumnChange.total = (Math.round((oneColumnChange.total / 1000) * 100) / 100) as IOtelSpan['duration'];
  oneColumnChange.avg = (Math.round((oneColumnChange.avg / 1000) * 100) / 100) as IOtelSpan['duration'];
  oneColumnChange.min = (Math.round((oneColumnChange.min / 1000) * 100) / 100) as IOtelSpan['duration'];
  oneColumnChange.max = (Math.round((oneColumnChange.max / 1000) * 100) / 100) as IOtelSpan['duration'];
  oneColumnChange.selfTotal = (Math.round((oneColumnChange.selfTotal / 1000) * 100) /
    100) as IOtelSpan['duration'];
  oneColumnChange.selfAvg = (Math.round((oneColumnChange.selfAvg / 1000) * 100) /
    100) as IOtelSpan['duration'];
  oneColumnChange.selfMin = (Math.round((oneColumnChange.selfMin / 1000) * 100) /
    100) as IOtelSpan['duration'];
  oneColumnChange.selfMax = (Math.round((oneColumnChange.selfMax / 1000) * 100) /
    100) as IOtelSpan['duration'];
  oneColumnChange.percent = Math.round((oneColumnChange.percent / 1) * 100) / 100;
  // oneColumnChange.colorToPercent;
  return oneColumnChange;
}

type StatsPerTag = {
  selfTotal: IOtelSpan['duration'];
  selfMin: IOtelSpan['duration'];
  selfMax: IOtelSpan['duration'];
  selfAvg: IOtelSpan['duration'];
  total: IOtelSpan['duration'];
  avg: IOtelSpan['duration'];
  min: IOtelSpan['duration'];
  max: IOtelSpan['duration'];
  count: number;
  percent: number;
};

function getDefaultStatsValue(trace: IOtelTrace): StatsPerTag {
  return {
    selfTotal: 0 as IOtelSpan['duration'],
    selfMin: trace.duration as IOtelSpan['duration'],
    selfMax: 0 as IOtelSpan['duration'],
    selfAvg: 0 as IOtelSpan['duration'],
    total: 0 as IOtelSpan['duration'],
    avg: 0 as IOtelSpan['duration'],
    min: trace.duration as IOtelSpan['duration'],
    max: 0 as IOtelSpan['duration'],
    count: 0,
    percent: 0,
  };
}

function getAttributeValueFromSpan(attributeKey: string, span: IOtelSpan, useOtelTerms: boolean) {
  let attributeValue = null as null | string;
  if (attributeKey === getOperationName(useOtelTerms)) {
    attributeValue = span.name;
  } else if (attributeKey === getServiceName()) {
    attributeValue = span.resource.serviceName;
  } else {
    const attr = span.attributes.find(a => a.key === attributeKey);
    if (attr) {
      attributeValue = String(attr.value);
    }
  }

  return attributeValue;
}

/**
 * Is used if only one dropdown is selected.
 */
function valueFirstDropdown(selectedAttributeKey: string, trace: IOtelTrace, useOtelTerms: boolean) {
  const allSpans = trace.spans;

  // used to build the table
  const allTableValues = [];
  const spanWithNoSelectedAttribute = []; // is only needed when there are Others

  const uniqueValuesForSelectedAttribute = new Set<string>();

  const statsPerAttributeValue = {} as Record<string, StatsPerTag>;
  const spanIdsWithSelectedAttribute = new Set<string>();

  for (let i = 0; i < allSpans.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKey, allSpans[i], useOtelTerms);

    if (!attributeValue) {
      continue;
    }

    statsPerAttributeValue[attributeValue] = computeColumnValues(
      trace,
      allSpans[i],
      allSpans,
      statsPerAttributeValue[attributeValue] ?? getDefaultStatsValue(trace)
    );

    spanIdsWithSelectedAttribute.add(allSpans[i].spanID);
    uniqueValuesForSelectedAttribute.add(attributeValue);
  }

  for (const attributeValue of uniqueValuesForSelectedAttribute) {
    const resultValue = statsPerAttributeValue[attributeValue];

    let color = '';
    if (selectedAttributeKey === getServiceName()) {
      color = colorGenerator.getColorByKey(attributeValue);
    }

    resultValue.selfAvg = (resultValue.selfTotal / resultValue.count) as IOtelSpan['duration'];
    resultValue.avg = (resultValue.total / resultValue.count) as IOtelSpan['duration'];
    let tableSpan: ITableSpan = {
      hasSubgroupValue: true,
      name: attributeValue,
      count: resultValue.count,
      total: resultValue.total,
      avg: resultValue.avg,
      min: resultValue.min,
      max: resultValue.max,
      isDetail: false,
      selfTotal: resultValue.selfTotal,
      selfAvg: resultValue.selfAvg,
      selfMin: resultValue.selfMin,
      selfMax: resultValue.selfMax,
      percent: resultValue.percent,
      color,
      searchColor: '',
      parentElement: 'none',
      colorToPercent: 'transparent',
      traceID: '',
    };
    tableSpan = buildOneColumn(tableSpan);
    allTableValues.push(tableSpan);
  }
  // checks if there is OTHERS
  if (selectedAttributeKey !== getServiceName() && selectedAttributeKey !== getOperationName(useOtelTerms)) {
    for (let i = 0; i < allSpans.length; i++) {
      const spanHasSelectedAttribute = spanIdsWithSelectedAttribute.has(allSpans[i].spanID);

      if (!spanHasSelectedAttribute) {
        spanWithNoSelectedAttribute.push(allSpans[i]);
      }
    }

    // Others is calculated
    let resultValue = getDefaultStatsValue(trace);
    for (let i = 0; i < spanWithNoSelectedAttribute.length; i++) {
      resultValue = computeColumnValues(trace, spanWithNoSelectedAttribute[i], allSpans, resultValue);
    }
    if (resultValue.count !== 0) {
      // Others is build
      resultValue.selfAvg = (resultValue.selfTotal / resultValue.count) as IOtelSpan['duration'];
      resultValue.avg = (resultValue.total / resultValue.count) as IOtelSpan['duration'];
      let tableSpanOTHERS: ITableSpan = {
        hasSubgroupValue: false,
        name: `Without ${getAttributeName(useOtelTerms)}: ${selectedAttributeKey}`,
        count: resultValue.count,
        total: resultValue.total,
        avg: resultValue.avg,
        min: resultValue.min,
        max: resultValue.max,
        isDetail: false,
        selfTotal: resultValue.selfTotal,
        selfAvg: resultValue.selfAvg,
        selfMin: resultValue.selfMin,
        selfMax: resultValue.selfMax,
        percent: resultValue.percent,
        color: '',
        searchColor: 'transparent',
        parentElement: '',
        colorToPercent: 'rgb(248,248,248)',
        traceID: '',
      };
      tableSpanOTHERS = buildOneColumn(tableSpanOTHERS);
      allTableValues.push(tableSpanOTHERS);
    }
  }
  return allTableValues;
}

/**
 * Creates columns for the children.
 */
function buildDetail(
  tempArray: ReadonlyArray<IOtelSpan>,
  allSpans: ReadonlyArray<IOtelSpan>,
  selectedAttributeKeySecond: string,
  parentName: string,
  trace: IOtelTrace,
  useOtelTerms: boolean
) {
  const newColumnValues = [];

  const statsPerAttributeValue = {} as Record<string, StatsPerTag>;
  const uniqueValuesForSelectedAttribute = new Set<string>();

  for (let i = 0; i < tempArray.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKeySecond, tempArray[i], useOtelTerms);

    if (!attributeValue) {
      continue;
    }

    statsPerAttributeValue[attributeValue] = computeColumnValues(
      trace,
      tempArray[i],
      allSpans,
      statsPerAttributeValue[attributeValue] ?? getDefaultStatsValue(trace)
    );

    uniqueValuesForSelectedAttribute.add(attributeValue);
  }

  for (const attributeValue of uniqueValuesForSelectedAttribute) {
    const resultValue = statsPerAttributeValue[attributeValue];

    let color = '';
    if (selectedAttributeKeySecond === getServiceName()) {
      color = colorGenerator.getColorByKey(attributeValue);
    }

    resultValue.selfAvg = (resultValue.selfTotal / resultValue.count) as IOtelSpan['duration'];
    resultValue.avg = (resultValue.total / resultValue.count) as IOtelSpan['duration'];
    let buildOneColumnValue: ITableSpan = {
      hasSubgroupValue: true,
      name: attributeValue,
      count: resultValue.count,
      total: resultValue.total,
      avg: resultValue.avg,
      min: resultValue.min,
      max: resultValue.max,
      isDetail: true,
      selfTotal: resultValue.selfTotal,
      selfAvg: resultValue.selfAvg,
      selfMin: resultValue.selfMin,
      selfMax: resultValue.selfMax,
      percent: resultValue.percent,
      color,
      searchColor: '',
      parentElement: parentName,
      colorToPercent: 'rgb(248,248,248)',
      traceID: '',
    };
    buildOneColumnValue = buildOneColumn(buildOneColumnValue);
    newColumnValues.push(buildOneColumnValue);
  }
  return newColumnValues;
}

/**
 * Used to generate detail rest.
 */
function generateDetailRest(
  allColumnValues: ITableSpan[],
  selectedAttributeKeySecond: string,
  trace: IOtelTrace,
  useOtelTerms: boolean
) {
  const allSpans = trace.spans;
  const newTable = [];
  for (let i = 0; i < allColumnValues.length; i++) {
    newTable.push(allColumnValues[i]);
    if (!allColumnValues[i].isDetail) {
      let resultValue = getDefaultStatsValue(trace);

      for (let j = 0; j < allSpans.length; j++) {
        if (
          allColumnValues[i].name === allSpans[j].resource.serviceName ||
          allColumnValues[i].name === allSpans[j].name
        ) {
          let rest = true;
          for (let l = 0; l < allSpans[j].attributes.length; l++) {
            if (allSpans[j].attributes[l].key === selectedAttributeKeySecond) {
              rest = false;
              break;
            }
          }
          if (rest) {
            resultValue = computeColumnValues(trace, allSpans[j], allSpans, resultValue);
          }
        }
      }
      resultValue.avg = (resultValue.total / resultValue.count) as IOtelSpan['duration'];
      resultValue.selfAvg = (resultValue.selfTotal / resultValue.count) as IOtelSpan['duration'];
      if (resultValue.count !== 0) {
        let buildOneColumnValue: ITableSpan = {
          hasSubgroupValue: false,
          name: `Without ${getAttributeName(useOtelTerms)}: ${selectedAttributeKeySecond}`,
          count: resultValue.count,
          total: resultValue.total,
          avg: resultValue.avg,
          min: resultValue.min,
          max: resultValue.max,
          isDetail: true,
          selfTotal: resultValue.selfTotal,
          selfAvg: resultValue.selfAvg,
          selfMin: resultValue.selfMin,
          selfMax: resultValue.selfMax,
          percent: resultValue.percent,
          color: '',
          searchColor: '',
          parentElement: allColumnValues[i].name,
          colorToPercent: 'rgb(248,248,248)',
          traceID: '',
        };
        buildOneColumnValue = buildOneColumn(buildOneColumnValue);
        newTable.push(buildOneColumnValue);
      }
    }
  }
  return newTable;
}

/**
 * Used to get values if the second dropdown is selected.
 */
function valueSecondDropdown(
  actualTableValues: ITableSpan[],
  selectedAttributeKey: string,
  selectedAttributeKeySecond: string,
  trace: IOtelTrace,
  useOtelTerms: boolean
) {
  const allSpans = trace.spans;
  const allTableValues = [];

  const isSecondDropdownAttribute =
    selectedAttributeKeySecond !== getServiceName() &&
    selectedAttributeKeySecond !== getOperationName(useOtelTerms);

  const spansMatchingAttributeValueFromFirstDropdown = {} as Record<string, IOtelSpan[]>;
  for (let i = 0; i < allSpans.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKey, allSpans[i], useOtelTerms);

    if (!attributeValue) {
      continue;
    }

    if (attributeValue in spansMatchingAttributeValueFromFirstDropdown) {
      spansMatchingAttributeValueFromFirstDropdown[attributeValue].push(allSpans[i]);
    } else {
      spansMatchingAttributeValueFromFirstDropdown[attributeValue] = [allSpans[i]];
    }
  }

  for (let i = 0; i < actualTableValues.length; i++) {
    // if the table is already in the detail view, then these entries are not considered
    if (actualTableValues[i].isDetail) {
      continue;
    }

    const spansWithSecondAttribute = spansMatchingAttributeValueFromFirstDropdown[actualTableValues[i].name];

    // true for row with name Without Attribute: ${selectedAttributeKey}
    const isTableValueWithoutAttribute = spansWithSecondAttribute === undefined;
    if (isTableValueWithoutAttribute) {
      allTableValues.push(actualTableValues[i]);
      continue;
    }

    const newColumnValues = buildDetail(
      spansWithSecondAttribute,
      allSpans,
      selectedAttributeKeySecond,
      actualTableValues[i].name,
      trace,
      useOtelTerms
    );

    allTableValues.push(actualTableValues[i]);

    if (newColumnValues.length > 0) {
      for (let j = 0; j < newColumnValues.length; j++) {
        allTableValues.push(newColumnValues[j]);
      }
    }
  }

  // if second dropdown is an attribute a rest must be created
  if (isSecondDropdownAttribute) {
    return generateDetailRest(allTableValues, selectedAttributeKeySecond, trace, useOtelTerms);
    // if no attribute is selected the values can be returned
  }
  return allTableValues;
}

/**
 * Returns the values of the table shown after the selection of the first dropdown.
 * @param selectedAttributeKey the key which was selected
 */
export function getColumnValues(selectedAttributeKey: string, trace: IOtelTrace, useOtelTerms: boolean) {
  return valueFirstDropdown(selectedAttributeKey, trace, useOtelTerms);
}

/**
 * Returns the values of the table shown after the selection of the second dropdown.
 * @param actualTableValues actual values of the table
 * @param selectedAttributeKey first key which is selected
 * @param selectedAttributeKeySecond second key which is selected
 * @param trace whole information about the trace
 * @param useOtelTerms whether to use OpenTelemetry terms
 */
export function getColumnValuesSecondDropdown(
  actualTableValues: ITableSpan[],
  selectedAttributeKey: string,
  selectedAttributeKeySecond: string,
  trace: IOtelTrace,
  useOtelTerms: boolean
) {
  if (selectedAttributeKeySecond !== 'Reset') {
    return valueSecondDropdown(
      actualTableValues,
      selectedAttributeKey,
      selectedAttributeKeySecond,
      trace,
      useOtelTerms
    );
  }
  return getColumnValues(selectedAttributeKey, trace, useOtelTerms);
}
