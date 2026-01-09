// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const path = require('path');

module.exports = {
  process(src, filename) {
    const fileExtension = path.extname(filename);
    if (fileExtension === 'css') {
      return { code: 'module.exports = "";' };
    }
    return { code: `module.exports = ${JSON.stringify(path.basename(filename))};` };
  },
};
