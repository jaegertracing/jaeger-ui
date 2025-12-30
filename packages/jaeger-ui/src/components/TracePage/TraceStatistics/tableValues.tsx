// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { IOtelTrace, IOtelSpan } from '../../../types/otel';
import { ITableSpan } from './types';
import colorGenerator from '../../../utils/color-generator';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

function parentChildOfMap(allSpans: IOtelSpan[]): Record<string, IOtelSpan[]> {
  const parentChildOfMap: Record<string, IOtelSpan[]> = {};
  allSpans.forEach(s => {
    if (s.parentSpanId) {
      parentChildOfMap[s.parentSpanId] = parentChildOfMap[s.parentSpanId] || [];
      parentChildOfMap[s.parentSpanId].push(s);
    }
  });
  return parentChildOfMap;
}

const memoizedParentChildOfMap = memoizeOne(parentChildOfMap);

function getChildOfSpans(parentID: string, allSpans: IOtelSpan[]): IOtelSpan[] {
  return memoizedParentChildOfMap(allSpans)[parentID] || [];
}

function computeSelfTime(parentSpan: IOtelSpan, allSpans: IOtelSpan[]): number {
  if (!parentSpan.hasChildren) return parentSpan.durationMicros;

  let parentSpanSelfTime = parentSpan.durationMicros;
  let previousChildEndTime = parentSpan.startTimeUnixMicros;

  const children = getChildOfSpans(parentSpan.spanId, allSpans).sort(
    (a, b) => a.startTimeUnixMicros - b.startTimeUnixMicros
  );

  const parentSpanEndTime = parentSpan.startTimeUnixMicros + parentSpan.durationMicros;

  for (let index = 0; index < children.length; index++) {
    const child = children[index];

    const childEndTime = child.startTimeUnixMicros + child.durationMicros;
    const childStartsAfterParentEnded = child.startTimeUnixMicros > parentSpanEndTime;
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
    const nonOverlappingStartTime = Math.max(previousChildEndTime, child.startTimeUnixMicros);
    const childEndTimeOrParentEndTime = Math.min(parentSpanEndTime, childEndTime);

    const nonOverlappingDuration = childEndTimeOrParentEndTime - nonOverlappingStartTime;
    parentSpanSelfTime -= nonOverlappingDuration;

    // last span which can be included in self time calculation, because it ends after parent span ends
    // parent |.......................|
    // child                      |.....|        - last span included in self time calculation
    // child                       |.........|   - skipped
    if (childEndTimeOrParentEndTime === parentSpanEndTime) {
      break;
    }

    previousChildEndTime = childEndTime;
  }

  return parentSpanSelfTime;
}

function computeColumnValues(
  trace: IOtelTrace,
  span: IOtelSpan,
  allSpans: IOtelSpan[],
  resultValue: StatsPerTag
) {
  const resultValueChange = resultValue;
  resultValueChange.count += 1;
  resultValueChange.total += span.durationMicros;
  if (resultValueChange.min > span.durationMicros) {
    resultValueChange.min = span.durationMicros;
  }
  if (resultValueChange.max < span.durationMicros) {
    resultValueChange.max = span.durationMicros;
  }

  const tempSelf = computeSelfTime(span, allSpans);
  if (resultValueChange.selfMin > tempSelf) {
    resultValueChange.selfMin = tempSelf;
  }
  if (resultValueChange.selfMax < tempSelf) {
    resultValueChange.selfMax = tempSelf;
  }
  resultValueChange.selfTotal += tempSelf;

  const onePercent = 100 / trace.durationMicros;
  resultValueChange.percent = resultValueChange.selfTotal * onePercent;

  return resultValueChange;
}

/**
 * Builds an object which represents a column.
 */
function buildOneColumn(oneColumn: ITableSpan) {
  const oneColumnChange = oneColumn;
  oneColumnChange.total = Math.round((oneColumnChange.total / 1000) * 100) / 100;
  oneColumnChange.avg = Math.round((oneColumnChange.avg / 1000) * 100) / 100;
  oneColumnChange.min = Math.round((oneColumnChange.min / 1000) * 100) / 100;
  oneColumnChange.max = Math.round((oneColumnChange.max / 1000) * 100) / 100;
  oneColumnChange.selfTotal = Math.round((oneColumnChange.selfTotal / 1000) * 100) / 100;
  oneColumnChange.selfAvg = Math.round((oneColumnChange.selfAvg / 1000) * 100) / 100;
  oneColumnChange.selfMin = Math.round((oneColumnChange.selfMin / 1000) * 100) / 100;
  oneColumnChange.selfMax = Math.round((oneColumnChange.selfMax / 1000) * 100) / 100;
  oneColumnChange.percent = Math.round((oneColumnChange.percent / 1) * 100) / 100;
  // oneColumnChange.colorToPercent;
  return oneColumnChange;
}

type StatsPerTag = {
  selfTotal: number;
  selfMin: number;
  selfMax: number;
  selfAvg: number;
  total: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  percent: number;
};

function getDefaultStatsValue(trace: IOtelTrace) {
  return {
    selfTotal: 0,
    selfMin: trace.durationMicros,
    selfMax: 0,
    selfAvg: 0,
    total: 0,
    avg: 0,
    min: trace.durationMicros,
    max: 0,
    count: 0,
    percent: 0,
  };
}

function getAttributeValueFromSpan(attributeKey: string, span: IOtelSpan) {
  let attributeValue = null as null | string;
  if (attributeKey === operationName) {
    attributeValue = span.name;
  } else if (attributeKey === serviceName) {
    attributeValue = span.resource?.serviceName || 'unknown';
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
function valueFirstDropdown(selectedAttributeKey: string, trace: IOtelTrace) {
  const allSpans = trace.spans;

  // used to build the table
  const allTableValues = [];
  const spanWithNoSelectedAttribute = []; // is only needed when there are Others

  const uniqueValuesForSelectedAttribute = new Set<string>();

  const statsPerAttributeValue = {} as Record<string, StatsPerTag>;
  const spanIdsWithSelectedAttribute = new Set<string>();

  for (let i = 0; i < allSpans.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKey, allSpans[i]);

    if (!attributeValue) {
      continue;
    }

    statsPerAttributeValue[attributeValue] = computeColumnValues(
      trace,
      allSpans[i],
      allSpans,
      statsPerAttributeValue[attributeValue] ?? getDefaultStatsValue(trace)
    );

    spanIdsWithSelectedAttribute.add(allSpans[i].spanId);
    uniqueValuesForSelectedAttribute.add(attributeValue);
  }

  for (const attributeValue of uniqueValuesForSelectedAttribute) {
    const resultValue = statsPerAttributeValue[attributeValue];

    let color = '';
    if (selectedAttributeKey === serviceName) {
      color = colorGenerator.getColorByKey(attributeValue);
    }

    resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
    resultValue.avg = resultValue.total / resultValue.count;
    let tableSpan = {
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
      colorToPercent: 'tranparent',
      traceID: '',
    };
    tableSpan = buildOneColumn(tableSpan);
    allTableValues.push(tableSpan);
  }
  // checks if there is OTHERS
  if (selectedAttributeKey !== serviceName && selectedAttributeKey !== operationName) {
    for (let i = 0; i < allSpans.length; i++) {
      const spanHasSelectedAttribute = spanIdsWithSelectedAttribute.has(allSpans[i].spanId);

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
      resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
      resultValue.avg = resultValue.total / resultValue.count;
      let tableSpanOTHERS = {
        hasSubgroupValue: false,
        name: `Without Attribute: ${selectedAttributeKey}`,
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
  tempArray: IOtelSpan[],
  allSpans: IOtelSpan[],
  selectedAttributeKeySecond: string,
  parentName: string,
  trace: IOtelTrace
) {
  const newColumnValues = [];

  const statsPerAttributeValue = {} as Record<string, StatsPerTag>;
  const uniqueValuesForSelectedAttribute = new Set<string>();

  for (let i = 0; i < tempArray.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKeySecond, tempArray[i]);

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
    if (selectedAttributeKeySecond === serviceName) {
      color = colorGenerator.getColorByKey(attributeValue);
    }

    resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
    resultValue.avg = resultValue.total / resultValue.count;
    let buildOneColumnValue = {
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
  trace: IOtelTrace
) {
  const allSpans = trace.spans;
  const newTable = [];
  for (let i = 0; i < allColumnValues.length; i++) {
    newTable.push(allColumnValues[i]);
    if (!allColumnValues[i].isDetail) {
      let resultValue = {
        selfTotal: 0,
        selfAvg: 0,
        selfMin: trace.durationMicros,
        selfMax: 0,
        total: 0,
        avg: 0,
        min: trace.durationMicros,
        max: 0,
        count: 0,
        percent: 0,
      };
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
      resultValue.avg = resultValue.total / resultValue.count;
      resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
      if (resultValue.count !== 0) {
        let buildOneColumnValue = {
          hasSubgroupValue: false,
          name: `Without Attribute: ${selectedAttributeKeySecond}`,
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
  trace: IOtelTrace
) {
  const allSpans = trace.spans;
  const allTableValues = [];

  const isSecondDropdownAttribute =
    selectedAttributeKeySecond !== serviceName && selectedAttributeKeySecond !== operationName;

  const spansMatchingAttributeValueFromFirstDropdown = {} as Record<string, IOtelSpan[]>;
  for (let i = 0; i < allSpans.length; i++) {
    const attributeValue = getAttributeValueFromSpan(selectedAttributeKey, allSpans[i]);

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
      trace
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
    return generateDetailRest(allTableValues, selectedAttributeKeySecond, trace);
    // if no attribute is selected the values can be returned
  }
  return allTableValues;
}

/**
 * Returns the values of the table shown after the selection of the first dropdown.
 * @param selectedAttributeKey the key which was selected
 */
export function getColumnValues(selectedAttributeKey: string, trace: IOtelTrace) {
  return valueFirstDropdown(selectedAttributeKey, trace);
}

/**
 * Returns the values of the table shown after the selection of the second dropdown.
 * @param actualTableValues actual values of the table
 * @param selectedAttributeKey first key which is selected
 * @param selectedAttributeKeySecond second key which is selected
 * @param trace whole information about the trace
 */
export function getColumnValuesSecondDropdown(
  actualTableValues: ITableSpan[],
  selectedAttributeKey: string,
  selectedAttributeKeySecond: string,
  trace: IOtelTrace
) {
  if (selectedAttributeKeySecond !== 'Reset') {
    return valueSecondDropdown(actualTableValues, selectedAttributeKey, selectedAttributeKeySecond, trace);
  }
  return getColumnValues(selectedAttributeKey, trace);
}
