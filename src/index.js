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

import React from 'react';
import ReactDOM from 'react-dom';
import { document } from 'global';

import 'basscss/css/basscss.css';

import JaegerUIApp from './components/App';
import PluginBail from './components/PluginBail/PluginBail';
import { init as initTracking } from './utils/metrics';

// import Bluebird from 'bluebird';
// import AssetsLoader from './utils/plugins/AssetsLoader';
// import getConfig from './utils/config/get-config';
import initPlugins from './utils/plugins/init-plugins';

/* istanbul ignore if */
if (process.env.NODE_ENV === 'development') {
  require.ensure(['global/window', 'react-addons-perf'], require => {
    const window = require('global/window');
    // eslint-disable-next-line import/no-extraneous-dependencies
    window.Perf = require('react-addons-perf');
  });
}

initTracking();

const UI_ROOT_ID = 'jaeger-ui-root';
// const plugins = getConfig().plugins;
// const loader = new AssetsLoader(plugins.options);

if (document && process.env.NODE_ENV !== 'test') {
  /* istanbul ignore if */
  initPlugins()
    .then(() => {
      ReactDOM.render(<JaegerUIApp />, document.getElementById(UI_ROOT_ID));
    })
    .catch(multiError => {
      console.log(multiError);
      const msgs = multiError.errors.map((error, i) =>
        <PluginBail key={`${error.message}-${i}`} message={error.message || error} stack={error.stack} />
      );
      ReactDOM.render(
        <div>
          {msgs}
        </div>,
        document.getElementById(UI_ROOT_ID)
      );
    });
}
// if (document && process.env.NODE_ENV !== 'test') {
//   /* istanbul ignore if */
//   Bluebird.all([
//     loader.addCssLink('/static/css/main.0f4cd097.css').reflect(),
//     loader.loadJavaScriptAsText('/static/js/1.chunk.js').reflect(),
//     loader.loadJavaScriptAsText('/static/js/1.chunk0.js').reflect(),
//     loader.loadJavaScriptAsText('/static/js/1.chunk1.js').reflect(),
//     loader.loadJavaScriptAsText('/static/js/1.chunk2.js').reflect(),
//   ]).then(args => {
//     if (args.some(p => p.isRejected())) {
//       const msgs = [];
//       args.forEach((pr, i) => {
//         if (pr.isRejected()) {
//           const error = pr.reason();
//           msgs.push(<PluginBail key={`${error.message}-${i}`} message={error.message} stack={error.stack} />);
//         }
//       });
//       ReactDOM.render(
//         <div>
//           {msgs}
//         </div>,
//         document.getElementById(UI_ROOT_ID)
//       );
//       return;
//     }
//     console.log(args);
//     window.args = args;
//     ReactDOM.render(<JaegerUIApp />, document.getElementById(UI_ROOT_ID));
//   });
// }
