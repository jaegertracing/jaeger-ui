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
