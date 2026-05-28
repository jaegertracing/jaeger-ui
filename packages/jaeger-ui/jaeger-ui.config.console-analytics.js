// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Example Jaeger UI config using the customWebAnalytics API to log all
// tracking events to the browser console.
//
// Usage: copy/rename to jaeger-ui.config.js and serve alongside Jaeger Query.
// JavaScript (not JSON) is required because customWebAnalytics is a function.

function UIConfig() {
  return {
    tracking: {
      // customWebAnalytics takes priority over gaID; both should not be set.
      customWebAnalytics: function consoleAnalyticsFactory(config, versionShort, versionLong) {
        return {
          // Called once when the app starts.
          init: function () {
            console.log('[analytics] init — version:', versionShort);
          },

          // Return true to activate the Redux tracking middleware.
          isEnabled: function () {
            return true;
          },

          // Set to true to enable error breadcrumb capture, false/null to disable.
          context: true,

          trackPageView: function (pathname, search) {
            console.log('[analytics] pageView', pathname + (search || ''));
          },

          trackError: function (description) {
            console.error('[analytics] error', description);
          },

          // labelOrValue may be a string label or a numeric value depending on the call site.
          trackEvent: function (category, action, labelOrValue, value) {
            console.log('[analytics] event', { category, action, labelOrValue, value });
          },
        };
      },
    },
  };
}
