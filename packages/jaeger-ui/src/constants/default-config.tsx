// Copyright (c) 2017 Uber Technologies, Inc.
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

import deepFreeze from 'deep-freeze';

import { FALLBACK_DAG_MAX_NUM_SERVICES } from './index';

export default deepFreeze(
  Object.defineProperty(
    {
      archiveEnabled: false,
      dependencies: {
        dagMaxNumServices: FALLBACK_DAG_MAX_NUM_SERVICES,
        menuEnabled: true,
      },
      linkPatterns: [],
      menu: [
        {
          label: 'About Jaeger',
          items: [
            {
              label: 'Website/Docs',
              url: 'https://www.jaegertracing.io/',
            },
            {
              label: 'Blog',
              url: 'https://medium.com/jaegertracing/',
            },
            {
              label: 'Twitter',
              url: 'https://twitter.com/JaegerTracing',
            },
            {
              label: 'Discussion Group',
              url: 'https://groups.google.com/forum/#!forum/jaeger-tracing',
            },
            {
              label: 'Online Chat',
              url: 'https://gitter.im/jaegertracing/Lobby',
            },
            {
              label: 'GitHub',
              url: 'https://github.com/jaegertracing/',
            },
          ],
        },
      ],
      pathAgnosticDecorations: [
        {
          acronym: 'ME',
          id: 'me',
          name: 'Missing Edges',
          summaryUrl: '/analytics/v1/serviceedges/missing/summary?source=connmon',
          summaryPath: '#{service}.count',
          detailUrl: 'serviceedges/missing?source=connmon&service=#{service}',
          detailPath: 'missingEdges',
          detailColumnDefPath: 'columnDefs',
        },
        {
          acronym: 'N',
          id: 'n',
          name: 'Neapolitan mix of success/error/no path',
          summaryUrl: 'neapolitan #{service}',
          summaryPath: 'val',
        },
        {
          acronym: 'AR',
          id: 'ar',
          name: 'All should resolve',
          summaryUrl: 'all should res #{service}',
          summaryPath: 'val',
        },
        {
          acronym: 'RGT',
          id: 'rgt',
          name: 'all should resolve details graph too #{service}',
          summaryUrl: 'details too #{service}',
          detailUrl: 'get graph',
          detailPath: 'deets.here',
          detailColumnDefPath: 'defs.here',
          summaryPath: 'val',
        },
        {
          acronym: 'RST',
          id: 'rst',
          name: 'all should resolve details string too #{service}',
          summaryUrl: 'details too #{service}',
          detailUrl: 'get string',
          detailPath: 'deets.here',
          summaryPath: 'val',
        },
        {
          acronym: 'RLT',
          id: 'rlt',
          name: 'all should resolve details list too #{service}',
          summaryUrl: 'details too #{service}',
          detailUrl: 'get list',
          detailPath: 'deets.here',
          summaryPath: 'val',
        },
        {
          acronym: 'RIL',
          id: 'ril',
          name: 'all should resolve, but infinite load details',
          summaryUrl: 'details too #{service}',
          detailUrl: 'infinite load',
          detailPath: 'deets.here',
          summaryPath: 'val',
        },
        {
          acronym: 'RDE',
          id: 'rde',
          name: 'all should resolve, but details err',
          summaryUrl: 'details too #{service}',
          detailUrl: 'deets err',
          detailPath: 'deets.here',
          summaryPath: 'val',
        },
        {
          acronym: 'RD4',
          id: 'rd4',
          name: 'all should resolve, but details not found',
          summaryUrl: 'details too #{service}',
          detailUrl: 'deets 404',
          detailPath: 'deets.here',
          summaryPath: 'val',
        },
        {
          acronym: 'OPs',
          id: 'ops',
          name: 'got dem ops',
          summaryUrl: 'neapolitan #{service}',
          summaryPath: 'val',
          opSummaryUrl: 'just #{service}',
          opSummaryPath: 'val',
          detailUrl: 'deets 404',
          detailPath: 'deets.here',
          opDetailUrl: 'get list',
          opDetailPath: 'deets.here',
        } /*, {
        TODO: op example too
      }*/,
      ],
      search: {
        maxLookback: {
          label: '2 Days',
          value: '2d',
        },
        maxLimit: 1500,
      },
      tracking: {
        gaID: null,
        trackErrors: true,
      },
    },
    // fields that should be individually merged vs wholesale replaced
    '__mergeFields',
    { value: ['dependencies', 'search', 'tracking'] }
  )
);

export const deprecations = [
  {
    formerKey: 'dependenciesMenuEnabled',
    currentKey: 'dependencies.menuEnabled',
  },
  {
    formerKey: 'gaTrackingID',
    currentKey: 'tracking.gaID',
  },
];
