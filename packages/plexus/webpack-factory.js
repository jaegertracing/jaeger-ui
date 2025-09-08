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
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const babelConfigPath = require.resolve('./babel.config');

// Note: Do not allow *.ts files
const extensions = ['.js', '.json', '.tsx'];
const extensionsRx = /\.(js|json|tsx)$/;
const extensionsWorkerRx = /\.worker\.(js|json|tsx)$/;

// Base Webpack configuration shared across all modes
function makeBaseConfig() {
  return {
    mode: 'production',
    target: 'web',
    context: __dirname,
    stats: {
      children: false,
      entrypoints: false,
      modules: false,
    },
    externals: [nodeExternals()],
    resolve: { extensions },
    module: {
      rules: [
        {
          //
          // Note: This `pre` is crucial (and not exactly obvious)
          //
          enforce: 'pre',
          test: extensionsRx,
          include: [join(__dirname, 'src'), join(__dirname, 'demo')],
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                babelrc: false,
                configFile: babelConfigPath,
              },
            },
          ],
        },
      ],
    },
  };
}

// Development-specific configuration with dev server and source maps
function makeDevConfig() {
  const entry = {
    index: join(__dirname, 'demo/src/index'),
    simple: join(__dirname, 'demo/src/SimpleGraph'),
    'ux-edges': join(__dirname, 'demo/src/UxEdges'),
  };
  const config = {
    entry,
    mode: 'development',
    devtool: 'cheap-module-source-map',
    output: {
      path: join(__dirname, 'build'),
      publicPath: '/',
      filename: 'assets/[name].js',
    },
    stats: 'normal',
    devServer: {
      port: 5000,
      historyApiFallback: true,
      hot: true,
      client: {
        overlay: true,
      },
      static: {
        directory: join(__dirname, 'demo'),
      },
    },
    plugins: Object.keys(entry).map(
      name =>
        new HtmlWebpackPlugin({
          template: join(__dirname, 'demo/template.ejs'),
          appMountId: 'root',
          lang: 'en',
          meta: {
            viewport: 'width=device-width, initial-scale=1',
          },
          filename: `${name}.html`,
          chunks: [name],
          title: `Plexus - Demo`,
        })
    ),
  };

  const rules = [
    {
      test: /\.html$/,
      use: [
        {
          loader: 'html-loader',
          options: {
            sources: {
              list: [
                {
                  tag: 'img',
                  attribute: 'src',
                  type: 'src',
                },
                {
                  tag: 'link',
                  attribute: 'href',
                  type: 'src',
                },
              ],
            },
          },
        },
      ],
    },
    {
      test: /\.css$/,
      exclude: [/\.module\.css$/],
      use: ['style-loader', 'css-loader'],
    },
    {
      test: /\.module\.css$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            modules: true,
          },
        },
      ],
    },
    {
      test: /\.(eot|ttf|woff|woff2|ico|png|jpg|jpeg|gif|svg|webp)$/,
      type: 'asset',
      generator: {
        filename: 'assets/[name][ext]',
      },
    },
  ];

  return { config, rules };
}

// Common production optimizations
function makeCommonProdConfig() {
  return {
    optimization: {
      minimize: true,
      splitChunks: false,
      runtimeChunk: false,
    },
  };
}

// Configuration for workers (e.g., layout.worker.tsx)
function makeWorkerConfig() {
  const layoutDir = join(__dirname, 'src/LayoutManager');
  const config = {
    experiments: {
      outputModule: true,
    },
    output: {
      path: layoutDir,
      publicPath: '/',
      filename: '[name].bundled.js',
      libraryTarget: 'module',
    },
    entry: {
      'layout.worker': join(layoutDir, 'layout.worker.tsx'),
    },
  };
  const rules = [
    {
      test: extensionsWorkerRx,
      use: [
        {
          loader: 'worker-loader',
          options: {
            inline: 'no-fallback',
            filename: '[name].js',
          },
        },
      ],
    },
  ];
  return { config, rules };
}

// UMD build for distribution (e.g., library export)
function makeUmdConfig() {
  const config = {
    ...makeCommonProdConfig(),
    output: {
      path: join(__dirname, 'dist'),
      publicPath: '/',
      filename: 'index.js',
      library: 'plexus',
      libraryTarget: 'umd',
      umdNamedDefine: true,
    },
    entry: join(__dirname, 'src/index'),
    plugins: [new CleanWebpackPlugin()],
  };
  return { config, rules: [] };
}

// Factory mapping for different build modes
const FACTORIES = {
  development: makeDevConfig,
  'layout-worker': makeWorkerConfig,
  umd: makeUmdConfig,
};

function makeWebpackConfig(mode) {
  const factory = FACTORIES[mode];
  if (!factory) {
    throw new Error(`Invalid config type: ${mode}`);
  }
  const { config, rules } = factory();
  const baseConfig = makeBaseConfig();
  baseConfig.module.rules.push(...rules);
  return {
    ...baseConfig,
    ...config,
  };
}

module.exports = makeWebpackConfig;
