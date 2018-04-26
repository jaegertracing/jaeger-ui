// module.exports = {
//   type: 'react-component',
//   npm: {
//     esModules: false,
//     umd: {
//       global: 'JaegerRetiform',
//       externals: {
//         react: 'React',
//       },
//     },
//   },
// };

// module.exports = {
//   type: 'react-component',
//   npm: {
//     esModules: true,
//     umd: false
//   }
// }

function babelConfig(config) {
  console.log(config);
  const workerRule = config.module.rules.find(rule => /worker/.test(rule.test.source));
  console.log(config.module.rules);
  console.log(workerRule);
  const babel = config.module.rules.find(rule => /babel-loader/.test(rule.loader));
  // const useBabel = Object.assign({}, babel);
  babel.enforce = 'pre';
  // const useBabel = JSON.parse(JSON.stringify(babel));
  // delete useBabel.test;
  // delete useBabel.exclude;
  // // useBabel.enforce = 'pre';
  // workerRule.use.unshift(useBabel);
  // console.log(require('util').inspect(config, { depth: null }));
  // process.exit(0);
  return config;
}

// module.exports = function nwbConfig(args, command, webpack) {
module.exports = function nwbConfig() {
  // console.log(args, command, webpack);
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
    // npm: {
    //   esModules: true,
    //   umd: false
    // },
    babel: {
      // presets: [require.resolve('babel-preset-flow')],
      // presets: ['minify'],
      // runtime: false,
      config(cfg) {
        cfg.compact = true;
        // console.log(JSON.stringify(cfg, null, 4));
        // throw 9;
        return cfg;
      },
    },
    webpack: {
      // uglify: false,
      // uglify: {
      //   uglifyOptions: {
      //     mangle: false,
      //     beautify: true
      //   }
      // },
      // rules: {
      //   worker: {
      //     test: /\.js$/,
      //     loader: 'worker-loader',
      //     options: { inline: true, fallback: false }
      //   }
      // }
      extra: {
        // Example of adding an extra rule which isn't managed by nwb,
        // assuming you have installed html-loader in your project.
        module: {
          rules: [
            {
              test: /\.worker\.js$/,
              use: [
                {
                  loader: require.resolve('worker-loader'),
                  options: { inline: true, fallback: false, name: '[name].[hash:8].js' },
                },
                // { loader: 'babel-loader' },
              ],
            },
          ],
        },
      },
      config: babelConfig,
    },
  };
};
