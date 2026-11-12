// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export type TPathAgnosticDecorationSchema = {
  acronym: string;
  id: string;
  name: string;
  summaryUrl: string;
  opSummaryUrl?: string;
  summaryPath: string;
  opSummaryPath?: string;
  detailLink?: string;
  detailUrl?: string;
  detailPath?: string;
  detailColumnDefPath?: string;
  opDetailUrl?: string;
  opDetailPath?: string;
  opDetailColumnDefPath?: string;
};

export type TPadEntry = number | string;
