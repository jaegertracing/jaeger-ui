function setBabelPre(config) {
  const babel = config.module.rules.find(rule => /babel-loader/.test(rule.loader));
  babel.enforce = 'pre';
  return config;
}

module.exports = function nwbConfig() {
  return {
    type: 'react-component',
    npm: {
      esModules: false,
      cjs: false,
      umd: {
        global: 'JaegerPlexus',
        externals: {
          react: 'React',
        },
      },
    },
    babel: {
      config(cfg) {
        // eslint-disable-next-line no-param-reassign
        cfg.compact = true;
        return cfg;
      },
    },
    webpack: {
      extra: {
        devtool: 'source-map',
        module: {
          rules: [
            {
              test: /\.worker\.js$/,
              use: [
                {
                  loader: require.resolve('worker-loader'),
                  options: { inline: true, fallback: false, name: '[name].[hash:8].js' },
                },
              ],
            },
          ],
        },
      },
      config: setBabelPre,
    },
  };
};
