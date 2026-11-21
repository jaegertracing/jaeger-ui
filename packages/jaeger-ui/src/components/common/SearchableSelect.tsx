// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { FunctionComponent, useState } from 'react';
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

type SearchableSelectProps = SelectProps & {
  /**
   * Enable fuzzy matching instead of simple substring matching.
   * Uses match-sorter library for more forgiving search.
   */
  fuzzy?: boolean;
  /**
   * Offer whatever the user types as an extra option, so a value the caller did not list
   * can still be picked. Use this where the option list is a set of suggestions rather
   * than the full set of legal values.
   */
  allowCustomValue?: boolean;
};

function hasOptionWithValue(children: React.ReactNode, value: string): boolean {
  let found = false;
  React.Children.forEach(children, child => {
    if (React.isValidElement<{ value?: unknown }>(child) && String(child.props.value) === value) {
      found = true;
    }
  });
  return found;
}

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
 *
 * @example
 * // Accepting a value that is not among the listed options
 * <SearchableSelect allowCustomValue>{suggestions}</SearchableSelect>
 */
const SearchableSelect: FunctionComponent<SearchableSelectProps> = ({
  fuzzy,
  allowCustomValue,
  children,
  onSearch,
  onOpenChange,
  ...props
}) => {
  const filterOption = fuzzy ? filterOptionsFuzzy : filterOptionsByLabel;
  const [typedValue, setTypedValue] = useState('');

  // Ant Design's Select only lets the user pick from the options it is given, so the typed
  // text becomes an option of its own. It is offered alongside the caller's options, which
  // means the filter and the keyboard treat it like any other entry.
  const customOption =
    allowCustomValue && typedValue && !hasOptionWithValue(children, typedValue) ? (
      <Select.Option key={typedValue} value={typedValue}>
        {typedValue}
      </Select.Option>
    ) : null;

  const handleSearch = (input: string) => {
    setTypedValue(input);
    onSearch?.(input);
  };

  // Ant Design drops the typed text when the dropdown closes, whether or not anything was
  // picked, so the option built from it goes at the same moment.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTypedValue('');
    }
    onOpenChange?.(open);
  };

  return (
    <Select
      showSearch
      filterOption={filterOption}
      onSearch={allowCustomValue ? handleSearch : onSearch}
      onOpenChange={allowCustomValue ? handleOpenChange : onOpenChange}
      {...props}
    >
      {children}
      {customOption}
    </Select>
  );
};

export default SearchableSelect;
