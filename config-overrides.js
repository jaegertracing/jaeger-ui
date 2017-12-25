const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const { injectBabelPlugin } = require('react-app-rewired');
// eslint-disable-next-line import/no-extraneous-dependencies
const rewireLess = require('react-app-rewire-less');
// eslint-disable-next-line import/no-extraneous-dependencies
const lessToJs = require('less-vars-to-js');

// Read the less file in as string
const loadedVarOverrides = fs.readFileSync('config-overrides-ant-variables.less', 'utf8');

// Pass in file contents
const modifyVars = lessToJs(loadedVarOverrides);
console.log('modify vars:', modifyVars);

module.exports = function override(_config, env) {
  let config = _config;
  config = injectBabelPlugin(['import', { libraryName: 'antd', style: true }], config);
  // config = rewireLess.withLoaderOptions({ modifyVars: { "@primary-color": "#cc0" } })(config, env);
  config = rewireLess.withLoaderOptions({ modifyVars })(config, env);
  return config;
};
