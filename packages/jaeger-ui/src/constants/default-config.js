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

export const FALLBACK_DAG_MAX_NUM_SERVICES = 100;
export const FALLBACK_TRACE_NAME_REGEXP_ALLOWLIST = [];

export const deprecations = [
  {
    formerKey: 'dependencies.dagMaxNumServices',
    currentKey: 'dependencies.menuEnabled',
    formerValue: 100,
    currentValue: false,
    callback: (config, formerKey, currentKey, formerValue, currentValue) => {
      const dagMaxNumServices = config.dependencies && config.dependencies.dagMaxNumServices;
      if (dagMaxNumServices !== FALLBACK_DAG_MAX_NUM_SERVICES) {
        // set the current key to true because the former value was not the default
        if (config.dependencies) {
          config.dependencies.menuEnabled = true;
        } else {
          config.dependencies = { menuEnabled: true };
        }
        // eslint-disable-next-line no-console
        console.warn(
          `Deprecated configuration key (${formerKey}: ${dagMaxNumServices}) detected, ` +
            `please use (${currentKey}: true) instead.`
        );
      }
    },
  },
];

export default {
  // Setting archiveEnabled to null means:
  // 1. Respect backend capability for non-memory storage
  // 2. Disable for in-memory storage (handled in getArchivedEnabled function)
  archiveEnabled: null,
  dependencies: {
    dagMaxNumServices: FALLBACK_DAG_MAX_NUM_SERVICES,
    menuEnabled: true,
  },
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
  linkPatterns: [],
  menu: [
    {
      label: 'About Jaeger',
      items: [
        {
          label: 'GitHub',
          url: 'https://github.com/jaegertracing/jaeger',
        },
        {
          label: 'Docs',
          url: 'https://www.jaegertracing.io/docs/latest',
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
          label: 'Gitter.im',
          url: 'https://gitter.im/jaegertracing/Lobby',
        },
        {
          label: 'Blog',
          url: 'https://medium.com/jaegertracing',
        },
      ],
    },
  ],
  traceNameRegExpAllowList: FALLBACK_TRACE_NAME_REGEXP_ALLOWLIST,
};