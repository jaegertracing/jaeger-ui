import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import JaegerUIApp from './components/App';
import { context as trackingContext } from './utils/tracking';

import 'u-basscss/css/flexbox.css';
import 'u-basscss/css/layout.css';
import 'u-basscss/css/margin.css';
import 'u-basscss/css/padding.css';
import 'u-basscss/css/position.css';
import 'u-basscss/css/typography.css';

const UI_ROOT_ID = 'jaeger-ui-root';

const root = createRoot(document.getElementById(UI_ROOT_ID));

if (typeof trackingContext === 'object' && trackingContext !== null) {
  trackingContext.context(() => {
    root.render(
      <BrowserRouter>
        <JaegerUIApp />
      </BrowserRouter>
    );
  });
} else {
  root.render(
    <BrowserRouter>
      <JaegerUIApp />
    </BrowserRouter>
  );
}
