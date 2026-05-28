// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Example Jaeger UI config using the customWebAnalytics API to log all
// tracking events to the browser console. JavaScript config (not JSON)
// is required because customWebAnalytics is a function reference.
//
// Usage: copy/rename to jaeger-ui.config.js and point the `jaeger` binary to it
// via the jaeger_query extension in Jaeger's YAML configuration file:
//
// extensions:
//   jaeger_query:
//     ui:
//       config_file: /etc/jaeger/config-ui.js

function consoleAnalytics(config, versionShort, versionLong) {
  function log(method, label, data) {
    console[method]('[analytics]', label, data !== undefined ? data : '');
  }

  return {
    init: function () {
      log('log', 'init — version:', versionShort + ' / ' + versionLong);
    },

    // Return true to activate the Redux tracking middleware.
    isEnabled: function () {
      return true;
    },

    // Set to true to enable error breadcrumb capture, false/null to disable.
    context: true,

    trackPageView: function (pathname, search) {
      log('log', 'pageView', pathname + (search || ''));
    },

    trackError: function (description) {
      log('error', 'error', description);
    },

    // labelOrValue may be a string label or a numeric value depending on the call site.
    trackEvent: function (category, action, labelOrValue, value) {
      log('log', 'event', { category, action, labelOrValue, value });
    },
  };
}

function UIConfig() {
  return {
    dependencies: {
      menuEnabled: true,
    },
    monitor: {
      menuEnabled: true,
    },
    tracking: {
      // customWebAnalytics takes priority over gaID; both should not be set.
      customWebAnalytics: consoleAnalytics,
    },
    linkPatterns: [
      {
        type: 'process',
        key: 'jaeger.version',
        url: 'https://github.com/jaegertracing/jaeger-client-java/releases/tag/#{jaeger.version}',
        text: 'Information about Jaeger SDK release #{jaeger.version}',
      },
    ],
    storageCapabilities: {
      archiveStorage: false,
      metricsStorage: true,
    },
  };
}
