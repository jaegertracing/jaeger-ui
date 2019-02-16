const { join } = require('path');

module.exports = neutrino => {
  neutrino.use([
    '@neutrinojs/react-components',
    {
      components: '.',
      include: [],
      exclude: [],
      babel: {
        presets: [
          '@babel/preset-typescript',
          [
            '@babel/preset-env',
            {
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

  neutrino.config.resolve.extensions.add('.tsx');
  neutrino.config.resolve.extensions.add('.ts');

  const extensions = neutrino.config.resolve.extensions
    .values()
    .map(ext => (ext[0] === '.' ? ext.slice(1) : ext));
  const compileTest = new RegExp(`\\.(${extensions.join('|')})$`);
  const workerTest = new RegExp(`worker\\.(${extensions.join('|')})$`);

  neutrino.config.module.rule('compile').test(compileTest);
  neutrino.config.module.rule('compile').include.add(join(__dirname, 'demo'));

  // if (process.env.NODE_ENV === 'development') {
  neutrino.config.node.set('module', 'empty');
  neutrino.config.node.set('Buffer', 'mock');
  // }

  // neutrino.use(['@neutrinojs/banner']);
  // const priorArgs = (neutrino.config.plugin('banner').get('args') || [])[0];
  // const args = {
  //   ...priorArgs,
  //   // banner: `typeof require !== 'undefined' && require('source-map-support').install({environment: "browser"});`,
  //   banner: `typeof require !== 'undefined' && require('source-map-support').install({environment: "browser"});`,
  //   exclude: workerTest,
  // };
  // neutrino.config.plugin('banner').set('args', [args]);
  neutrino.config.plugins.delete('banner');

  neutrino.use(['@neutrinojs/jest']);

  neutrino.config.module
    .rule('worker')
    .test(workerTest)
    .use('worker')
    .loader(require.resolve('worker-loader'))
    .options({
      inline: true,
      fallback: false,
      name: '[name].js',
    });

  neutrino.config.module.rule('compile').enforce('pre');

  neutrino.config.plugins.delete('hot');

  neutrino.config.resolve.alias.set('worker', join(__dirname, 'src'));
};
