// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import type React from 'react';
import { TExample } from '../ExamplesLink';

export type TStyledValue = {
  linkTo?: string;
  styling?: React.CSSProperties;
  value: string | React.ReactElement;
};

export type TColumnDef = {
  key: string;
  label?: string;
  preventSort?: boolean;
  styling?: React.CSSProperties;
};

export type TColumnDefs = (string | TColumnDef)[];

export type TRow = Record<string, TStyledValue | string | number | TExample[]>;

export type TDetails = string | string[] | TRow[];

export type TFilterDropdownProps = {
  clearFilters?: () => void;
  confirm: () => void;
  selectedKeys: React.Key[];
  setSelectedKeys: (selectedKeys: React.Key[]) => void;
};
