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

import * as _ from 'lodash';
import { ITableSpan } from './types';

/**
 * Sort
 * @param array input whitch is sorted
 * @param key attribut which is used for sorting
 * @param sortAsc Specifies the direction in which the sort is to take place.
 */
function sortByKey(array: ITableSpan[], key: string, sortAsc: boolean) {
  return array.sort(function calc(a, b) {
    const x = (a as any)[key];
    const y = (b as any)[key];
    if (sortAsc) {
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    }
    if (x < y) {
      return 1;
    }
    if (x > y) {
      return -1;
    }
    return 0;
  });
}

/**
 * Sorts the table according to the key that is passed.
 * @param array Input which is sorted
 * @param key Which attribute is used for sorting
 * @param upDown How should the data be sorted? Up or down
 */
export default function sortTable(array: any[], key: string, sortAsc: boolean) {
  const isDetailArray = [];
  const isNoDetail = [];
  for (let i = 0; i < array.length; i++) {
    if (array[i].isDetail) {
      isDetailArray.push(array[i]);
    } else {
      isNoDetail.push(array[i]);
    }
  }
  sortByKey(isNoDetail, key, sortAsc);
  const diffParentNames = [] as any;
  for (let i = 0; i < isDetailArray.length; i++) {
    if (diffParentNames.length === 0) {
      diffParentNames.push(isDetailArray[i]);
    } else {
      const lookup = { parentElement: isDetailArray[i].parentElement };
      const hasSameName = _.some(diffParentNames, lookup);
      if (!hasSameName) {
        diffParentNames.push(isDetailArray[i]);
      }
    }
  }
  for (let j = 0; j < diffParentNames.length; j++) {
    const tempArray = _.chain(isDetailArray)
      .filter(filterBy => filterBy.parentElement === diffParentNames[j].parentElement)
      .groupBy(x => x.parentElement)
      .map(value => ({ parentElement: key, groupedArry: value }))
      .value()[0].groupedArry;

    sortByKey(tempArray, key, sortAsc);
    if (tempArray.length > 0) {
      // build whole array
      let rememberIndex = 0;
      for (let i = 0; i < isNoDetail.length; i++) {
        if (isNoDetail[i].name === tempArray[0].parentElement) {
          rememberIndex = i;
        }
      }
      for (let i = 0; i < tempArray.length; i++) {
        isNoDetail.splice(rememberIndex + 1, 0, tempArray[i]);
        rememberIndex += 1;
      }
    }
  }
  return isNoDetail;
}
