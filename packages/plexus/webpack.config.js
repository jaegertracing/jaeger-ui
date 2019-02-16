const { join } = require('path');
const neutrino = require('neutrino');

const config = neutrino().webpack();
const folder = config.mode === 'development' ? 'demo' : 'src';
config.entry = {
  index: join(__dirname, folder, 'index'),
};

module.exports = [config];
