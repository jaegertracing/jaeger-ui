// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Trace, Span } from '../../../types/trace';
import { ITableSpan } from './types';
import colorGenerator from '../../../utils/color-generator';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

function computeSelfTime(parentSpan: Span, allSpans: Span[], spanMap: Map<string, Span>): number {
  if (!parentSpan.hasChildren) return parentSpan.duration;

  let parentSpanSelfTime = parentSpan.duration;
  let previousChildEndTime = parentSpan.startTime;

  // Get children directly from the span (already sorted by startTime from the tree)
  const children = parentSpan.childSpans;

  const parentSpanEndTime = parentSpan.startTime + parentSpan.duration;

  for (let index = 0; index < children.length; index++) {
    const child = children[index];

    const childEndTime = child.startTime + child.duration;
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
    parentSpanSelfTime -= nonOverlappingDuration;

    // last span which can be included in self time calculation, because it ends after parent span ends
    // parent |......................|
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
  trace: Trace,
  span: Span,
  allSpans: Span[],
  spanMap: Map<string, Span>,
  resultValue: StatsPerTag
) {
  const resultValueChange = resultValue;
  resultValueChange.count += 1;
  resultValueChange.total += span.duration;
  if (resultValueChange.min > span.duration) {
    resultValueChange.min = span.duration;
  }
  if (resultValueChange.max < span.duration) {
    resultValueChange.max = span.duration;
  }

  const tempSelf = computeSelfTime(span, allSpans, spanMap);
  if (resultValueChange.selfMin > tempSelf) {
    resultValueChange.selfMin = tempSelf;
  }
  if (resultValueChange.selfMax < tempSelf) {
    resultValueChange.selfMax = tempSelf;
  }
  resultValueChange.selfTotal += tempSelf;

  const onePercent = 100 / trace.duration;
  resultValueChange.percent = resultValueChange.selfTotal * onePercent;

  return resultValueChange;
}

/**
 * Builds an obeject which represents a column.
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

function getDefaultStatsValue(trace: Trace) {
  return {
    selfTotal: 0,
    selfMin: trace.duration,
    selfMax: 0,
    selfAvg: 0,
    total: 0,
    avg: 0,
    min: trace.duration,
    max: 0,
    count: 0,
    percent: 0,
  };
}

function getTagValueFromSpan(tagKey: string, span: Span) {
  let tagValue = null as null | string;
  if (tagKey === operationName) {
    tagValue = span.operationName;
  } else if (tagKey === serviceName) {
    tagValue = span.process.serviceName;
  } else {
    for (let tagIndex = 0; tagIndex < span.tags.length; tagIndex++) {
      const tag = span.tags[tagIndex];

      if (tag.key !== tagKey) {
        continue;
      }

      tagValue = tag.value;
      break;
    }
  }

  return tagValue;
}

/**
 * Is used if only one dropdown is selected.
 */
function valueFirstDropdown(selectedTagKey: string, trace: Trace) {
  const allSpans = trace.spans;
  // Use the pre-built spanMap
  const spanMap = trace.spanMap;

  // used to build the table
  const allTableValues = [];
  const spanWithNoSelectedTag = []; // is only needed when there are Others

  const uniqueValuesForSelectedTag = new Set<string>();

  const statsPerTagValue = {} as Record<string, StatsPerTag>;
  const spanIdsWithSelectedTag = new Set<string>();

  for (let i = 0; i < allSpans.length; i++) {
    const tagValue = getTagValueFromSpan(selectedTagKey, allSpans[i]);

    if (!tagValue) {
      continue;
    }

    statsPerTagValue[tagValue] = computeColumnValues(
      trace,
      allSpans[i],
      allSpans,
      spanMap,
      statsPerTagValue[tagValue] ?? getDefaultStatsValue(trace)
    );

    spanIdsWithSelectedTag.add(allSpans[i].spanID);
    uniqueValuesForSelectedTag.add(tagValue);
  }

  for (const tagValue of uniqueValuesForSelectedTag) {
    const resultValue = statsPerTagValue[tagValue];

    let color = '';
    if (selectedTagKey === serviceName) {
      color = colorGenerator.getColorByKey(tagValue);
    }

    resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
    resultValue.avg = resultValue.total / resultValue.count;
    let tableSpan = {
      hasSubgroupValue: true,
      name: tagValue,
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
  if (selectedTagKey !== serviceName && selectedTagKey !== operationName) {
    for (let i = 0; i < allSpans.length; i++) {
      const spanHasSelectedTag = spanIdsWithSelectedTag.has(allSpans[i].spanID);

      if (!spanHasSelectedTag) {
        spanWithNoSelectedTag.push(allSpans[i]);
      }
    }
    // Others is calculated
    let resultValue = getDefaultStatsValue(trace);
    for (let i = 0; i < spanWithNoSelectedTag.length; i++) {
      resultValue = computeColumnValues(trace, spanWithNoSelectedTag[i], allSpans, spanMap, resultValue);
    }
    if (resultValue.count !== 0) {
      // Others is build
      resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
      resultValue.avg = resultValue.total / resultValue.count;
      let tableSpanOTHERS = {
        hasSubgroupValue: false,
        name: `Without Tag: ${selectedTagKey}`,
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
  tempArray: Span[],
  allSpans: Span[],
  spanMap: Map<string, Span>,
  selectedTagKeySecond: string,
  parentName: string,
  trace: Trace
) {
  const newColumnValues = [];

  const statsPerTagValue = {} as Record<string, StatsPerTag>;
  const uniqueValuesForSelectedTag = new Set<string>();

  for (let i = 0; i < tempArray.length; i++) {
    const tagValue = getTagValueFromSpan(selectedTagKeySecond, tempArray[i]);

    if (!tagValue) {
      continue;
    }

    statsPerTagValue[tagValue] = computeColumnValues(
      trace,
      tempArray[i],
      allSpans,
      spanMap,
      statsPerTagValue[tagValue] ?? getDefaultStatsValue(trace)
    );

    uniqueValuesForSelectedTag.add(tagValue);
  }

  for (const tagValue of uniqueValuesForSelectedTag) {
    const resultValue = statsPerTagValue[tagValue];

    let color = '';
    if (selectedTagKeySecond === serviceName) {
      color = colorGenerator.getColorByKey(tagValue);
    }

    resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
    resultValue.avg = resultValue.total / resultValue.count;
    let buildOneColumnValue = {
      hasSubgroupValue: true,
      name: tagValue,
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
  selectedTagKeySecond: string,
  trace: Trace,
  spanMap: Map<string, Span>
) {
  const allSpans = trace.spans;
  const newTable = [];
  for (let i = 0; i < allColumnValues.length; i++) {
    newTable.push(allColumnValues[i]);
    if (!allColumnValues[i].isDetail) {
      let resultValue = {
        selfTotal: 0,
        selfAvg: 0,
        selfMin: trace.duration,
        selfMax: 0,
        total: 0,
        avg: 0,
        min: trace.duration,
        max: 0,
        count: 0,
        percent: 0,
      };
      for (let j = 0; j < allSpans.length; j++) {
        if (
          allColumnValues[i].name === allSpans[j].process.serviceName ||
          allColumnValues[i].name === allSpans[j].operationName
        ) {
          let rest = true;
          for (let l = 0; l < allSpans[j].tags.length; l++) {
            if (allSpans[j].tags[l].key === selectedTagKeySecond) {
              rest = false;
              break;
            }
          }
          if (rest) {
            resultValue = computeColumnValues(trace, allSpans[j], allSpans, spanMap, resultValue);
          }
        }
      }
      resultValue.avg = resultValue.total / resultValue.count;
      resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
      if (resultValue.count !== 0) {
        let buildOneColumnValue = {
          hasSubgroupValue: false,
          name: `Without Tag: ${selectedTagKeySecond}`,
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
  selectedTagKey: string,
  selectedTagKeySecond: string,
  trace: Trace
) {
  const allSpans = trace.spans;
  const allTableValues = [];
  // Use the pre-built spanMap
  const spanMap = trace.spanMap;

  const isSecondDropdownTag = selectedTagKeySecond !== serviceName && selectedTagKeySecond !== operationName;

  const spansMatchingTagValueFromFirstDropdown = {} as Record<string, Span[]>;
  for (let i = 0; i < allSpans.length; i++) {
    const tagValue = getTagValueFromSpan(selectedTagKey, allSpans[i]);

    if (!tagValue) {
      continue;
    }

    if (tagValue in spansMatchingTagValueFromFirstDropdown) {
      spansMatchingTagValueFromFirstDropdown[tagValue].push(allSpans[i]);
    } else {
      spansMatchingTagValueFromFirstDropdown[tagValue] = [allSpans[i]];
    }
  }

  for (let i = 0; i < actualTableValues.length; i++) {
    // if the table is already in the detail view, then these entries are not considered
    if (actualTableValues[i].isDetail) {
      continue;
    }

    const spansWithSecondTag = spansMatchingTagValueFromFirstDropdown[actualTableValues[i].name];

    // true for row with name Without Tag: ${selectedTagKey}
    const isTableValueWithoutTag = spansWithSecondTag === undefined;
    if (isTableValueWithoutTag) {
      allTableValues.push(actualTableValues[i]);
      continue;
    }

    const newColumnValues = buildDetail(
      spansWithSecondTag,
      allSpans,
      spanMap,
      selectedTagKeySecond,
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

  // if second dropdown is a tag a rest must be created
  if (isSecondDropdownTag) {
    return generateDetailRest(allTableValues, selectedTagKeySecond, trace, spanMap);
    // if no tag is selected the values can be returned
  }
  return allTableValues;
}

/**
 * Returns the values of the table shown after the selection of the first dropdown.
 * @param selectedTagKey the key which was selected
 */
export function getColumnValues(selectedTagKey: string, trace: Trace) {
  return valueFirstDropdown(selectedTagKey, trace);
}

/**
 * Returns the values of the table shown after the selection of the second dropdown.
 * @param actualTableValues actual values of the table
 * @param selectedTagKey first key which is selected
 * @param selectedTagKeySecond second key which is selected
 * @param trace whole information about the trace
 */
export function getColumnValuesSecondDropdown(
  actualTableValues: ITableSpan[],
  selectedTagKey: string,
  selectedTagKeySecond: string,
  trace: Trace
) {
  if (selectedTagKeySecond !== 'Reset') {
    return valueSecondDropdown(actualTableValues, selectedTagKey, selectedTagKeySecond, trace);
  }
  return getColumnValues(selectedTagKey, trace);
}
