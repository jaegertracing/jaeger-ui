// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const { join } = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const babelConfigPath = require.resolve('./babel.config');

// Note: Do not allow *.ts files
const extensions = ['.js', '.json', '.tsx', '.ts'];
const extensionsRx = /\.(js|json|tsx|ts)$/;

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
