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

export type TNewData = Record<
  string,
  {
    withoutOp?: Record<string, TPadEntry>;
    withOp?: Record<string, Record<string, TPadEntry>>;
  }
>;
