// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export function localeStringComparator(itemA, itemB) {
  return itemA.localeCompare(itemB);
}

export function numberSortComparator(itemA, itemB) {
  return itemA - itemB;
}

export function classNameForSortDir(dir) {
  return `sorted ${dir === 1 ? 'ascending' : 'descending'}`;
}

export function getNewSortForClick(prevSort, column) {
  const { defaultDir = 1 } = column;

  return {
    key: column.name,
    dir: prevSort.key === column.name ? -1 * prevSort.dir : defaultDir,
  };
}

export function createSortClickHandler(column, currentSortKey, currentSortDir, updateSort) {
  return function onClickSortingElement() {
    const { key, dir } = getNewSortForClick({ key: currentSortKey, dir: currentSortDir }, column);
    updateSort(key, dir);
  };
}
