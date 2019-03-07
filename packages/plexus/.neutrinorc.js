// Copyright (c) 2019 Uber Technologies, Inc.
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

const { join } = require('path');

module.exports = neutrino => {
  neutrino.use([
    '@neutrinojs/react-components',
    // Note: webpack.config.js adds the appropriate entry point.
    {
      // don't use a 'components' folder
      components: '.',
      include: [],
      exclude: [],
      babel: {
        presets: [
          '@babel/preset-typescript',
          [
            '@babel/preset-env',
            {
              // this should match the settings in jaeger-ui/package.json
              targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
            },
          ],
        ],
      },
      ruleId: 'compile',
      useId: 'babel',
      hot: false,
    },
  ]);

  // also compile TypeScript files
  neutrino.config.resolve.extensions.add('.tsx');
  neutrino.config.resolve.extensions.add('.ts');

  const extensions = neutrino.config.resolve.extensions
    .values()
    .map(ext => (ext[0] === '.' ? ext.slice(1) : ext));

  // the compile rule needs to be informed of the new extensions after
  // @neutrinojs/react-components is added via .use(...), and configuring in
  // the .use(...) call doesn't work
  const compileTest = new RegExp(`\\.(${extensions.join('|')})$`);
  neutrino.config.module.rule('compile').test(compileTest);

  // Add the demo directory as a valid source folder.
  // Note: webpack.config.js adds `demo/index.tsx` as the entry point for the
  // demo when starting for "development".
  neutrino.config.module.rule('compile').include.add(join(__dirname, 'demo'));

  // these have to be stubbed / mocked
  neutrino.config.node.set('module', 'empty');
  neutrino.config.node.set('Buffer', 'mock');

  // by default, the banner plugin adds the following (and a lot of headaches)
  // require('source-map-support').install();
  neutrino.config.plugins.delete('banner');

  // placeholder
  neutrino.use(['@neutrinojs/jest']);

  // worker filenames match the format <some-name>.worker.tsx
  const workerTest = new RegExp(`worker\\.(${extensions.join('|')})$`);
  neutrino.config.module
    .rule('worker')
    .test(workerTest)
    .use('worker')
    // use the webpack worker-loader loader
    .loader(require.resolve('worker-loader'))
    .options({
      inline: true,
      fallback: false,
      name: '[name].js',
    });

  // babel compilation has to happen as "pre" in terms of loader ordering
  neutrino.config.module.rule('compile').enforce('pre');

  // nothing but headaches from HMR
  neutrino.config.plugins.delete('hot');

  // In order to Type the web worker, it needs to be treated as an external
  // module with a local type definition, in TypeScript. Local files can't be
  // treated as external modules, so using "worker" as an alias for
  // <package_root>/src allows TS to see local workers as a file in an external
  // package.
  neutrino.config.resolve.alias.set('worker-alias', join(__dirname, 'src'));
};
