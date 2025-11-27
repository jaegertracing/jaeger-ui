// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export function localeStringComparator(itemA: string, itemB: string): number {
  return itemA.localeCompare(itemB);
}

export function numberSortComparator(itemA: number, itemB: number): number {
  return itemA - itemB;
}

export function classNameForSortDir(dir: number): string {
  return `sorted ${dir === 1 ? 'ascending' : 'descending'}`;
}

type SortColumn = {
  name: string;
  defaultDir?: number;
};

type SortState = {
  key: string;
  dir: number;
};

export function getNewSortForClick(prevSort: SortState, column: SortColumn): SortState {
  const { defaultDir = 1 } = column;

  return {
    key: column.name,
    dir: prevSort.key === column.name ? -1 * prevSort.dir : defaultDir,
  };
}

export function createSortClickHandler(
  column: SortColumn,
  currentSortKey: string,
  currentSortDir: number,
  updateSort: (key: string, dir: number) => void
): () => void {
  return function onClickSortingElement() {
    const { key, dir } = getNewSortForClick({ key: currentSortKey, dir: currentSortDir }, column);
    updateSort(key, dir);
  };
}
