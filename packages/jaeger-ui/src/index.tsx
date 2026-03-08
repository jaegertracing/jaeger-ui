// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// site-prefix.js must be the first import of the main webpack entrypoint
// because it configures the webpack publicPath.

import './site-prefix';

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { createRoot } from 'react-dom/client';

import JaegerUIApp from './components/App';
import { context as trackingContext } from './utils/tracking';

// these need to go after the App import

import 'u-basscss/css/flexbox.css';
import 'u-basscss/css/layout.css';
import 'u-basscss/css/margin.css';
import 'u-basscss/css/padding.css';
import 'u-basscss/css/position.css';
import 'u-basscss/css/typography.css';

const UI_ROOT_ID = 'jaeger-ui-root';
const rootElement = document.getElementById(UI_ROOT_ID);
if (!rootElement) {
  throw new Error(`Element with id ${UI_ROOT_ID} not found`);
}

const root = createRoot(rootElement);

if (typeof trackingContext === 'object' && trackingContext !== null) {
  (trackingContext as any).context(() => {
    root.render(
      <BrowserRouter>
        <CompatRouter>
          <JaegerUIApp />
        </CompatRouter>
      </BrowserRouter>
    );
  });
} else {
  root.render(
    <BrowserRouter>
      <CompatRouter>
        <JaegerUIApp />
      </CompatRouter>
    </BrowserRouter>
  );
}
