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
 * - Fixes dropdown arrow click behavior (issue #3227)
 *
 * Use this component for:
 * - Standard form dropdowns that need search/filter capability
 * - Large lists that need virtualization (pass `virtual` prop)
 * - When fuzzy matching is preferred (pass `fuzzy` prop)
 *
 * Bug fix for issue #3227: In Ant Design 6, clicking on the dropdown arrow of a
 * Select with showSearch can cause the dropdown to open and immediately close.
 * This happens because the mouseDown event on the arrow causes the search input
 * to lose focus (blur), which triggers the dropdown to close.
 *
 * Root cause: When clicking the suffix icon (arrow), the browser's default mouseDown
 * behavior shifts focus away from the search input, causing a blur event that closes
 * the dropdown immediately after it opens.
 *
 * Solution: Use the `onMouseDown` prop on the Select component itself to prevent
 * the default behavior when clicking on child elements (including the suffix icon).
 * This prevents focus loss while still allowing the dropdown to toggle properly.
 *
 * @example
 * // Basic usage
 * <SearchableSelect options={services} />
 *
 * @example
 * // With fuzzy matching and virtualization
 * <SearchableSelect options={services} fuzzy virtual />
 */
const SearchableSelect: FunctionComponent<SearchableSelectProps> = ({ fuzzy, onMouseDown, ...props }) => {
  const filterOption = fuzzy ? filterOptionsFuzzy : filterOptionsByLabel;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click target is the suffix icon (arrow)
    const target = e.target as HTMLElement;
    const isSuffixIcon = target.closest('.ant-select-arrow');

    if (isSuffixIcon) {
      // Prevent default to avoid focus loss on the search input
      e.preventDefault();
    }

    // Call the original onMouseDown if provided
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  return <Select showSearch filterOption={filterOption} onMouseDown={handleMouseDown} {...props} />;
};

export default SearchableSelect;
