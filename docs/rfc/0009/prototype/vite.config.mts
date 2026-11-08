// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This config serves the RFC 0009 prototype with the Vite and the dependencies that are
// installed for packages/jaeger-ui, so the prototype has no package.json of its own.
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const uiPkg = path.join(repoRoot, 'packages/jaeger-ui');
const require = createRequire(path.join(uiPkg, 'package.json'));
const react = require('@vitejs/plugin-react').default;

const dep = (name: string) => path.join(uiPkg, 'node_modules', name);

export default {
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      react: dep('react'),
      'react-dom': dep('react-dom'),
      antd: dep('antd'),
      'react-icons': dep('react-icons'),
    },
  },
  server: { fs: { allow: [repoRoot] }, port: 5199 },
};
