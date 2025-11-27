// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React, { FunctionComponent } from 'react';
import { Select, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/es/select';

export const filterOptionsByLabel = (input: string, option?: DefaultOptionType) => {
  return (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase());
};

const SearchableSelect: FunctionComponent<SelectProps> = props => {
  return <Select showSearch filterOption={filterOptionsByLabel} {...props} />;
};

export default SearchableSelect;
