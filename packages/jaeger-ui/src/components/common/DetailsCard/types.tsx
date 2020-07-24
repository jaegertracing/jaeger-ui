// Copyright (c) 2020 Uber Technologies, Inc.
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
