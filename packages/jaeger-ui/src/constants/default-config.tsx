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
import getVersion from '../utils/version/get-version';

const { version } = require('../../package.json');

export default deepFreeze(
  Object.defineProperty(
    {
      archiveEnabled: false,
      dependencies: {
        dagMaxNumServices: FALLBACK_DAG_MAX_NUM_SERVICES,
        menuEnabled: true,
      },
      linkPatterns: [],
      qualityMetrics: {
        menuEnabled: false,
        menuLabel: 'Trace Quality',
      },
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
              url: 'https://cloud-native.slack.com/archives/CGG7NFUJ3',
            },
            {
              label: 'GitHub',
              url: 'https://github.com/jaegertracing/',
            },
            {
              label: `Jaeger ${getVersion().gitVersion}`,
            },
            {
              label: `Commit ${getVersion().gitCommit.substring(0, 7)}`,
            },
            {
              label: `Build ${getVersion().buildDate}`,
            },
            {
              label: `Jaeger UI v${version}`,
            },
          ],
        },
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
        customWebAnalytics: null,
      },
      opLabel: null,
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
