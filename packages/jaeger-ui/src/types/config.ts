// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TPathAgnosticDecorationSchema } from '../model/path-agnostic-decorations/types';
import { IWebAnalyticsFunc } from './tracking';
import { TNil } from '.';

export type SpanDetailPanelMode = 'inline' | 'sidepanel';

export type ConfigMenuItem = {
  label: string;
  url?: string;
  anchorTarget?: '_self' | '_blank' | '_parent' | '_top';
};

export type ConfigMenuGroup = {
  label: string;
  items: readonly ConfigMenuItem[];
};

export type TScript = {
  text: string;
  type: 'inline';
};

type LinkPatternsConfig = {
  // type defines the entity that the pattern applies to.
  // 'traces' patterns apply to the whole trace, and have access to 'traceID' value.
  // Other patterns apply to tags at different levels. They have access to the value
  // of the respective tag, for example:
  //   "linkPatterns": [{
  //     "type": "process",
  //     "key": "jaeger.version",
  //     "url": "https://github.com/jaegertracing/jaeger-client-java/releases/tag/#{jaeger.version}",
  //     "text": "Information about Jaeger SDK release #{jaeger.version}"
  //   }]
  type: 'process' | 'tags' | 'logs' | 'traces';
  // key of the tag for tag-level patterns.
  key?: string;
  // url of the link, with variable extrapoliation, e.g. "#{jaeger.version}".
  url: string;
  // tooltip of the link, with variable extrapoliation, e.g. "#{jaeger.version}".
  text: string;
};

export type MonitorEmptyStateConfig = {
  mainTitle?: string;
  subTitle?: string;
  description?: string;
  button?: {
    text?: string;
    onClick?: () => void;
  };
  info?: string;
  alert?: {
    message?: string;
    type?: 'success' | 'info' | 'warning' | 'error';
  };
};

type MonitorConfig = {
  menuEnabled?: boolean;
  emptyState?: MonitorEmptyStateConfig;
  docsLink?: string;
};

export type TraceGraphConfig = {
  // layoutManagerMemory controls the total memeory available for the GraphViz
  // Emscripten module instance. The value should be a power of two.
  // The default of 16MB should be sufficient for most cases — only consider
  // using a larger number if you run into the error "Cannot enlarge memory arrays".
  // See https://github.com/jaegertracing/jaeger-ui/issues/1249 for background
  layoutManagerMemory?: number;
};

// BackendCapabilities is the capability blob advertised by the backend via
// window.getJaegerBackendCapabilities. The backend overlays this on top of
// the user UI config independently, so the user UI config cannot set these
// values in production.
export type BackendCapabilities = {
  // archiveStorage indicates whether the query service supports archive storage.
  archiveStorage?: boolean;
  // metricsStorage indicates whether the query service supports metrics storage (for Monitor/SPM tab).
  metricsStorage?: boolean;
  // aiAssistant indicates whether the in-app AI assistant should be available.
  // The backend advertises this when a live AI sidecar is reachable.
  aiAssistant?: boolean;
};

// Default values are provided in packages/jaeger-ui/src/constants/default-config.tsx
export type Config = {
  //
  // archiveEnabled enables the Archive Trace button in the trace view.
  // Requires Query Service to be configured with "archive" storage backend.
  archiveEnabled?: boolean;

  // criticalPath enables to show the criticalPath of each span in a trace view.
  criticalPathEnabled: boolean;

  // dependencies controls the behavior of System Architecture tab.
  dependencies?: {
    // menuEnabled enables or disables the System Architecture tab.
    menuEnabled?: boolean;

    // dagMaxNumServices defines the maximum number of services allowed
    // before the DAG dependency view is disabled. Too many services
    // cause the DAG view to be non-responsive.
    dagMaxNumServices?: number;
  };

  // menu controls the dropdown menu in the top-right corner of the UI.
  // When populated, this element completely overrides the default menu.
  menu: readonly (ConfigMenuGroup | ConfigMenuItem)[];

  // search section controls some aspects of the Search panel.
  search?: {
    // defaultLookback sets the pre-selected value in the Lookback dropdown when
    // no lookback is present in the URL. Must be one of the values in the dropdown
    // (e.g. "5m", "15m", "30m", "1h", "2h", "3h", "6h", "12h", "24h", "2d",
    // "3d", "5d", "7d", "2w", "3w", "4w"). Defaults to "1h" when not set or
    // when the configured value is not one of the recognized options.
    defaultLookback?: string;

    // maxLookback controls how far back in time the search may apply.
    // By default the Lookback dropdown contains values from "Last 5 minutes"
    // to "Last 2 days". Setting maxLookback to a shorter time range,
    // such as "6h" disables the longer ranges.
    maxLookback: {
      // Bare duration label shown in the search form dropdown. The UI prepends "Last "
      // automatically, so use e.g. "2 days" (not "Last 2 days").
      label: string;

      // The value submitted in the search query if the label is selected.
      // Examples: "6h", "2d".
      value: string;
    };
    // maxLimit configures the "search depth" parameter.
    // The interpretation of search depth varies between different backends.
    maxLimit: number;

    // adjustEndTime shifts the search end time back by the specified duration.
    // This helps avoid incomplete traces that may still be receiving spans.
    // When set, the UI will show "(adjusted)" next to the lookback dropdown.
    // Examples: "1m" for 1 minute, "30s" for 30 seconds.
    // Default is undefined (no adjustment).
    adjustEndTime?: string;
  };

  // api controls backend request behavior.
  api: {
    // requestTimeoutMs overrides the default timeout (in milliseconds)
    // for requests made to the Jaeger backend.
    requestTimeoutMs?: number;
  };

  // scripts is an array of URLs of additional JavaScript files to be loaded.
  // TODO when is it useful?
  scripts?: readonly TScript[];

  // traceIdDisplayLength controls the length of the trace ID displayed in the UI.
  traceIdDisplayLength?: number;

  // backendCapabilities is the capability blob advertised by the backend
  // (overlaid on top of any embedded UI config at index.html boot). Internal
  // UI code reads this field.
  backendCapabilities?: BackendCapabilities;

  // topTagPrefixes defines a set of prefixes for span tag names that are considered
  // "important" and cause the matching tags to appear higher in the list of tags.
  // For example, topTagPrefixes=['http.'] would cause all span tags that begin with
  // "http." to be shown above all other tags.
  // See https://github.com/jaegertracing/jaeger-ui/issues/218 for background.
  topTagPrefixes?: readonly string[];

  // tracking section controls the collection of usage metrics as analytics events.
  // By default, Jaeger uses Google Analytics for event tracking (if enabled).
  tracking?: {
    // gaID is the Google Analytics account ID.
    gaID: string | TNil;

    // trackErrors enables the use of Raven SDK to capture rich details
    // about the exceptions and report them as analytics events.
    // See https://github.com/jaegertracing/jaeger-ui/issues/39 for background.
    trackErrors: boolean | TNil;

    // customWebAnalytics allows using custom implementation of event reporting,
    // as an alternative to Google Analytics.
    // This only works when using a JavaScript-based configuration file,
    // which allows passing functions to the configuration.
    // See https://github.com/jaegertracing/jaeger-ui/issues/652 for background.
    customWebAnalytics: IWebAnalyticsFunc | TNil;
  };

  // linkPatterns allow customizing the display of traces with external links.
  // The patterns can apply either at trace level, or at individual tag level.
  // When a matching pattern is found, a link is rendered, whose URL and tooltip
  // strings support variable substitution.
  // A trace level link is displayed as an icon at the top of the trace view.
  // A tag-level link converts the tag value into a hyperlink.
  linkPatterns?: readonly LinkPatternsConfig[];

  // monitor section controls Service Performance Monitoring tab.
  monitor?: MonitorConfig;

  // traceGraph controls the trace graph under trace page
  traceGraph?: TraceGraphConfig;

  // Disables the file upload control.
  disableFileUploadControl: boolean;

  // Disables the json view.
  disableJsonView: boolean;

  // Alters all targets of links to empty or top to
  // prevent the creation of a new page.
  forbidNewPage: boolean;

  // The following features are experimental / undocumented.

  deepDependencies?: {
    menuEnabled?: boolean;
  };
  pathAgnosticDecorations?: readonly TPathAgnosticDecorationSchema[];
  qualityMetrics?: {
    menuEnabled?: boolean;
    menuLabel?: string;
    apiEndpoint?: string;
  };
  traceDiff?: {
    helpLink: string;
  };
  themes: {
    enabled: boolean;
  };
  // traceTimeline controls the trace timeline viewer layout options.
  traceTimeline?: {
    // enableSidePanel enables the side panel layout option in the trace timeline.
    // When false, the side panel toggle is hidden and only inline detail mode is available.
    // Default: true (experimental, opt-out).
    enableSidePanel?: boolean;

    // defaultDetailPanelMode sets the initial detail panel mode when enableSidePanel is true
    // and the user has not yet stored a preference in localStorage.
    // 'inline' preserves the current behavior as the default.
    // 'sidepanel' makes the side panel the default experience for new users.
    // Default: 'inline'.
    defaultDetailPanelMode?: SpanDetailPanelMode;

    // spanPillsEnabled controls span pill overlays in the trace timeline.
    // Default: true. Set to false to disable if needed.
    spanPillsEnabled?: boolean;
  };

  // useOpenTelemetryTerms determines whether the UI uses legacy Jaeger terminology
  // (tags, logs, process, operation name) or OpenTelemetry terminology
  // (attributes, events, resource, name).
  useOpenTelemetryTerms: boolean;

  // tracing controls in-browser OpenTelemetry instrumentation. When enabled,
  // the UI exports spans via OTLP/HTTP to the same-origin path
  // '/api/otlp/v1/traces', which the jaeger-query otlp_proxy extension
  // forwards to the OTel Collector. The endpoint is intentionally not
  // configurable — see docs/adr/0011-ui-emitted-trace-ingest.md.
  // Disabled by default.
  tracing?: {
    enabled?: boolean;
    serviceName?: string;
    sampleRatio?: number;
    // sessionInactivityMinutes controls how many minutes of inactivity end
    // the current user session. The next span after the timeout starts a new
    // `session.id` and stamps the prior one as `session.previous_id`,
    // per OTel session semantics. Default: 30.
    sessionInactivityMinutes?: number;
  };
};
