const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { development: !process.env.CI }],
    '@babel/preset-typescript',
  ],
  plugins: ['babel-plugin-inline-react-svg'],
});
