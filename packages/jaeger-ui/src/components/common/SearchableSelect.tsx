// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { FunctionComponent } from 'react';
import { Select, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';

export const filterOptionsByLabel = (input: string, option?: DefaultOptionType) => {
  return (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase());
};

/**
 * SearchableSelect is a lightweight wrapper around Ant Design's Select component
 * that adds search/filter functionality with case-insensitive label matching.
 *
 * Use this component for:
 * - Standard form dropdowns that need search/filter capability
 * - Simple select inputs where Ant Design's built-in styling is appropriate
 * - Cases where you don't need virtualization or fuzzy matching
 *
 * For header-style navigation with custom styling, virtualization for large lists,
 * and fuzzy matching, consider using NameSelector instead.
 *
 * @see NameSelector - For header-style selectors with advanced features
 */
const SearchableSelect: FunctionComponent<SelectProps> = props => {
  return <Select showSearch filterOption={filterOptionsByLabel} {...props} />;
};

export default SearchableSelect;
