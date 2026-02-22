// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { FunctionComponent } from 'react';
import { Select, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { matchSorter } from 'match-sorter';

/**
 * Case-insensitive substring filter for Select options.
 */
export const filterOptionsByLabel = (input: string, option?: DefaultOptionType) => {
  return (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase());
};

/**
 * Fuzzy match filter using match-sorter library for more forgiving search.
 * Note: This creates a single-element array for each option during filtering,
 * which is acceptable for typical use cases. For very large lists, consider
 * using Ant Design's filterSort prop with a custom sorting function.
 */
export const filterOptionsFuzzy = (input: string, option?: DefaultOptionType) => {
  if (!input) return true;
  const label = option?.children?.toString() ?? '';
  return matchSorter([label], input).length > 0;
};

export type SearchableSelectProps = SelectProps & {
  /**
   * Enable fuzzy matching instead of simple substring matching.
   * Uses match-sorter library for more forgiving search.
   */
  fuzzy?: boolean;
};

/**
 * SearchableSelect is a wrapper around Ant Design's Select component
 * that adds search/filter functionality.
 *
 * Features:
 * - Case-insensitive label matching (default)
 * - Optional fuzzy matching via `fuzzy` prop (uses match-sorter)
 * - Supports virtualization via Ant Design's `virtual` prop for large lists
 * - All standard Ant Design Select props are supported
 *
 * Use this component for:
 * - Standard form dropdowns that need search/filter capability
 * - Large lists that need virtualization (pass `virtual` prop)
 * - When fuzzy matching is preferred (pass `fuzzy` prop)
 *
 * @example
 * // Basic usage
 * <SearchableSelect options={services} />
 *
 * @example
 * // With fuzzy matching and virtualization
 * <SearchableSelect options={services} fuzzy virtual />
 */
const SearchableSelect: FunctionComponent<SearchableSelectProps> = ({ fuzzy, ...props }) => {
  const filterOption = fuzzy ? filterOptionsFuzzy : filterOptionsByLabel;

  // Handle the specific arrow click issue in Ant Design v6
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if the click is on the arrow icon specifically
    // We need to be precise here to avoid interfering with option clicks
    const isArrowIcon = target.classList.contains('ant-select-arrow') ||
                       (target.closest('.ant-select-arrow') !== null &&
                        !target.closest('.ant-select-dropdown'));

    if (isArrowIcon) {
      // Prevent the default mousedown behavior on the arrow which can cause
      // the dropdown to close immediately after opening
      e.preventDefault();
      e.stopPropagation();

      // Manually trigger the click to open the dropdown by simulating a click
      // on the selector area instead of the arrow
      const selectElement = target.closest('.ant-select') as HTMLElement;
      if (selectElement) {
        const selector = selectElement.querySelector('.ant-select-selector') as HTMLElement;
        if (selector) {
          selector.click();
        }
      }
    }
  };

  return (
    <Select
      showSearch
      filterOption={filterOption}
      onMouseDown={handleMouseDown}
      {...props}
    />
  );
};

export default SearchableSelect;
