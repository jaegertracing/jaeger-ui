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

import memoizeOne from 'memoize-one';
import _uniq from 'lodash/uniq';
import { Trace, Span } from '../../../types/trace';
import { ITableSpan } from './types';
import colorGenerator from '../../../utils/color-generator';

const serviceName = 'Service Name';
const operationName = 'Operation Name';

function parentChildOfMap(allSpans: Span[]): Record<string, Span[]> {
  const parentChildOfMap: Record<string, Span[]> = {};
  allSpans.forEach(s => {
    if (s.references) {
      // Filter for CHILD_OF we don't want to calculate FOLLOWS_FROM (prod-cons)
      const parentIDs = s.references.filter(r => r.refType === 'CHILD_OF').map(r => r.spanID);
      parentIDs.forEach((pID: string) => {
        parentChildOfMap[pID] = parentChildOfMap[pID] || [];
        parentChildOfMap[pID].push(s);
      });
    }
  });
  return parentChildOfMap;
}

const memoizedParentChildOfMap = memoizeOne(parentChildOfMap);

function getChildOfSpans(parentID: string, allSpans: Span[]): Span[] {
  return memoizedParentChildOfMap(allSpans)[parentID] || [];
}

function computeSelfTime(parentSpan: Span, allSpans: Span[]): number {
  if (!parentSpan.hasChildren) return parentSpan.duration;

  let parentSpanSelfTime = parentSpan.duration;
  let previousChildEndTime = parentSpan.startTime;

  const children = getChildOfSpans(parentSpan.spanID, allSpans).sort((a, b) => a.startTime - b.startTime);

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

function computeColumnValues(trace: Trace, span: Span, allSpans: Span[], resultValue: StatsPerTag) {
  const resultValueChange = resultValue;
  resultValueChange.count += 1;
  resultValueChange.total += span.duration;
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

/**
 * Is used if only one dropdown is selected.
 */
function valueFirstDropdown(selectedTagKey: string, trace: Trace) {
  const allSpans = trace.spans;

  // used to build the table
  const allTableValues = [];
  const spanWithNoSelectedTag = []; // is only needed when there are Others

  const uniqueValuesForSelectedTag = new Set<string>();

  const statsPerTagValue = {} as Record<string, StatsPerTag>;
  const spanIdsWithSelectedTag = new Set<string>();

  for (let i = 0; i < allSpans.length; i++) {
    let tagValue = null as null | string;
    if (selectedTagKey === operationName) {
      tagValue = allSpans[i].operationName;
    } else if (selectedTagKey === serviceName) {
      tagValue = allSpans[i].process.serviceName;
    } else {
      for (let tagIndex = 0; tagIndex < allSpans[i].tags.length; tagIndex++) {
        const tag = allSpans[i].tags[tagIndex];

        if (tag.key !== selectedTagKey) {
          continue;
        }

        tagValue = tag.value;
        break;
      }
    }

    if (!tagValue) {
      continue;
    }

    statsPerTagValue[tagValue] = computeColumnValues(
      trace,
      allSpans[i],
      allSpans,
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
      resultValue = computeColumnValues(trace, spanWithNoSelectedTag[i], allSpans, resultValue);
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
  diffNamesA: string[],
  tempArray: Span[],
  allSpans: Span[],
  selectedTagKeySecond: string,
  parentName: string,
  isDetail: boolean,
  trace: Trace
) {
  const newColumnValues = [];
  for (let j = 0; j < diffNamesA.length; j++) {
    let color = '';
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
    for (let l = 0; l < tempArray.length; l++) {
      if (isDetail) {
        for (let a = 0; a < tempArray[l].tags.length; a++) {
          if (
            tempArray[l].tags[a].key === selectedTagKeySecond &&
            diffNamesA[j] === tempArray[l].tags[a].value
          ) {
            resultValue = computeColumnValues(trace, tempArray[l], allSpans, resultValue);
          }
        }
      } else if (selectedTagKeySecond === serviceName) {
        if (diffNamesA[j] === tempArray[l].process.serviceName) {
          resultValue = computeColumnValues(trace, tempArray[l], allSpans, resultValue);
          color = colorGenerator.getColorByKey(tempArray[l].process.serviceName);
        }
      } else if (diffNamesA[j] === tempArray[l].operationName) {
        resultValue = computeColumnValues(trace, tempArray[l], allSpans, resultValue);
      }
    }
    resultValue.selfAvg = resultValue.selfTotal / resultValue.count;
    resultValue.avg = resultValue.total / resultValue.count;
    let buildOneColumnValue = {
      hasSubgroupValue: true,
      name: diffNamesA[j],
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
function generateDetailRest(allColumnValues: ITableSpan[], selectedTagKeySecond: string, trace: Trace) {
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
            resultValue = computeColumnValues(trace, allSpans[j], allSpans, resultValue);
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

  for (let i = 0; i < actualTableValues.length; i++) {
    // if the table is already in the detail view, then these entries are not considered
    if (!actualTableValues[i].isDetail) {
      const tempArray = [];
      let diffNamesA = [] as any;
      // all Spans withe the same value (first dropdown)
      for (let j = 0; j < allSpans.length; j++) {
        if (selectedTagKey === serviceName) {
          if (actualTableValues[i].name === allSpans[j].process.serviceName) {
            tempArray.push(allSpans[j]);
            diffNamesA.push(allSpans[j].operationName);
          }
        } else if (selectedTagKey === operationName) {
          if (actualTableValues[i].name === allSpans[j].operationName) {
            tempArray.push(allSpans[j]);
            diffNamesA.push(allSpans[j].process.serviceName);
          }
          // if first dropdown is a tag
        } else {
          for (let l = 0; l < allSpans[j].tags.length; l++) {
            if (
              allSpans[j].tags[l].key === selectedTagKey &&
              actualTableValues[i].name === allSpans[j].tags[l].value
            ) {
              tempArray.push(allSpans[j]);
              if (selectedTagKeySecond === operationName) {
                diffNamesA.push(allSpans[j].operationName);
              } else if (selectedTagKeySecond === serviceName) {
                diffNamesA.push(allSpans[j].process.serviceName);
              }
            }
          }
        }
      }
      let newColumnValues = [] as any;
      // if second dropdown is no tag
      if (selectedTagKeySecond === serviceName || selectedTagKeySecond === operationName) {
        diffNamesA = _uniq(diffNamesA);
        newColumnValues = buildDetail(
          diffNamesA,
          tempArray,
          allSpans,
          selectedTagKeySecond,
          actualTableValues[i].name,
          false,
          trace
        );
      } else {
        // second dropdown is a tag
        diffNamesA = [] as any;
        for (let j = 0; j < tempArray.length; j++) {
          for (let l = 0; l < tempArray[j].tags.length; l++) {
            if (tempArray[j].tags[l].key === selectedTagKeySecond) {
              diffNamesA.push(tempArray[j].tags[l].value);
            }
          }
        }
        diffNamesA = _uniq(diffNamesA);
        newColumnValues = buildDetail(
          diffNamesA,
          tempArray,
          allSpans,
          selectedTagKeySecond,
          actualTableValues[i].name,
          true,
          trace
        );
      }
      allTableValues.push(actualTableValues[i]);
      if (newColumnValues.length > 0) {
        for (let j = 0; j < newColumnValues.length; j++) {
          allTableValues.push(newColumnValues[j]);
        }
      }
    }
  }
  // if second dropdown is a tag a rest must be created
  if (selectedTagKeySecond !== serviceName && selectedTagKeySecond !== operationName) {
    return generateDetailRest(allTableValues, selectedTagKeySecond, trace);
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
