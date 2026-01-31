// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../../../types/otel';

export interface ITableSpan {
  hasSubgroupValue: boolean; // True when the entry has the subgroup attribute in it.
  name: string;
  count: number;
  total: IOtelSpan['duration'];
  avg: IOtelSpan['duration'];
  min: IOtelSpan['duration'];
  max: IOtelSpan['duration'];
  selfTotal: IOtelSpan['duration'];
  selfAvg: IOtelSpan['duration'];
  selfMin: IOtelSpan['duration'];
  selfMax: IOtelSpan['duration'];
  percent: number;
  isDetail: boolean; // True when the entry represents a subgroup aggregation.
  parentElement: string;
  color: string; // If it is a service name, the color will be set.
  searchColor: string;
  colorToPercent: string; // Color created by percent
  traceID: string;
}

export interface ITableValues {
  uid: string;
  value: number;
}

export interface IColumnValue {
  title: string;
  attribute: string;
  suffix: string;
  isDecimal: boolean;
}
