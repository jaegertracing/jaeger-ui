// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { TExample } from '../common/ExamplesLink';
import { TColumnDef, TRow } from '../common/DetailsCard/types';

export type TQualityMetrics = {
  traceQualityDocumentationLink: string;
  bannerText?:
    | string
    | {
        value: string;
        styling: React.CSSProperties;
      };
  scores: {
    key: string;
    label: string;
    max: number;
    value: number;
  }[];
  metrics: {
    name: string;
    category: string; // matching some scores.key;
    description: string;
    metricDocumentationLink: string;
    metricWeight: number;
    passCount: number;
    passExamples?: TExample[];
    failureCount: number;
    failureExamples?: TExample[];
    exemptionCount?: number;
    exemptionExamples?: TExample[];
    details?: {
      description?: string;
      header?: string;
      columns: TColumnDef[];
      rows: TRow[];
    }[];
  }[];
  clients?: {
    version: string;
    minVersion: string;
    count: number;
    examples: TExample[];
  }[];
};
