// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import deepFreeze from 'deep-freeze';

import { FALLBACK_DAG_MAX_NUM_SERVICES } from './index';
import getVersion from '../utils/version/get-version';

import { version } from '../../package.json';
import { Config } from '../types/config';

const defaultConfig: Config = {
  archiveEnabled: true,
  criticalPathEnabled: true,
  dependencies: {
    dagMaxNumServices: FALLBACK_DAG_MAX_NUM_SERVICES,
    menuEnabled: true,
  },
  menu: [
    {
      label: 'About Jaeger',
      items: [
        {
          label: 'Website / Docs',
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
          label: 'Discussions / Q&A',
          url: 'https://github.com/orgs/jaegertracing/discussions',
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
  traceIdDisplayLength: 7,
  storageCapabilities: {
    archiveStorage: false,
  },
  tracking: {
    gaID: null,
    trackErrors: true,
    customWebAnalytics: null,
  },
  linkPatterns: [],
  monitor: {
    menuEnabled: true,
    emptyState: {
      mainTitle: 'Get started with Service Performance Monitoring',
      subTitle:
        'A high-level monitoring dashboard that helps you cut down the time to identify and resolve anomalies and issues.',
      description:
        'Service Performance Monitoring aggregates tracing data into RED metrics and visualizes them in service and operation level dashboards.',
      button: {
        text: 'Read the Documentation',
        onClick: () => window.open('https://www.jaegertracing.io/docs/latest/spm/'),
      },
      alert: {
        message: 'Service Performance Monitoring requires a Prometheus-compatible time series database.',
        type: 'info',
      },
    },
    docsLink: 'https://www.jaegertracing.io/docs/latest/spm/',
    // Configure tag attributes for filtering metrics in the Monitor tab
    // Example: [{ name: 'environment', label: 'Environment' }, { name: 'region', label: 'Region' }]
    // See docs/MONITOR.md for detailed configuration instructions
    tagAttributes: [],
  },
  disableFileUploadControl: false,
  disableJsonView: false,
  forbidNewPage: false,
  traceGraph: {
    layoutManagerMemory: undefined,
  },

  deepDependencies: {
    menuEnabled: false,
  },
  qualityMetrics: {
    menuEnabled: false,
    menuLabel: 'Trace Quality',
    apiEndpoint: '/api/quality-metrics',
  },
  traceDiff: {
    helpLink: 'https://medium.com/jaegertracing/trace-comparisons-arrive-in-jaeger-1-7-a97ad5e2d05d',
  },
};

// Fields that should be merged with user-supplied config values rather than overwritten.
type TMergeField = 'dependencies' | 'search' | 'tracking';
export const mergeFields: readonly TMergeField[] = ['dependencies', 'search', 'tracking'];

export default deepFreeze(defaultConfig);

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
