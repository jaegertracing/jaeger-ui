const path = require('path');

// Simple Jest transform that stubs out CSS files and returns the file name as the mock content for other file types.
module.exports = {
  process(src, filename) {
    const fileExtension = path.extname(filename);
    if (fileExtension === 'css') {
      return { code: 'module.exports = "";' };
    }
    return { code: `module.exports = ${JSON.stringify(path.basename(filename))};` };
  },
};
