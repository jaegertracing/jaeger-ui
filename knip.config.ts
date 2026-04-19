// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['scripts/**/*.{js,ts,cjs}'],
      ignoreDependencies: [
        // Optional native bindings for @napi-rs; installed as optionalDependencies and
        // never imported directly — the parent package selects the right one at runtime.
        '@emnapi/core',
        '@emnapi/runtime',

        // Pinned to a specific version via devDependencies to override the transitive
        // version pulled in by @exodus/bytes; not imported directly anywhere.
        '@noble/hashes',

        // Declared as a workspace-level dependency so that @tanstack/react-virtual is
        // hoisted to the root node_modules (used by packages/jaeger-ui but declared at
        // root to ensure a single copy is resolved).
        '@tanstack/react-virtual',

        // Peer dependency of @testing-library/user-event; not imported directly but
        // must be present in node_modules for the package to work.
        '@testing-library/dom',

        // Hoisted to root devDependencies to satisfy @testing-library/jest-dom's peer
        // dep on `vitest`; the actual test runs are in the workspace packages.
        '@vitest/coverage-v8',
        'vitest',

        // Consumed by @vitejs/plugin-react via `babel: { babelrc: true }` in
        // vitest.config.ts. Babel processes JSX transforms at test time; not imported
        // directly by any source file so knip cannot detect it.
        '@babel/core',

        // Used by scripts/run-depcheck.sh via its CLI binary (node_modules/.bin/depcheck),
        // not imported as a module — knip does not trace shell script invocations.
        'depcheck',

        // Referenced by Oxlint via the `jsPlugins` field in the `lint` section of vite.config.ts to provide
        // React hooks rules (react-x/rules-of-hooks, react-x/exhaustive-deps).
        // Oxlint delegates to this ESLint plugin rather than having a native implementation.
        'eslint-plugin-react-x',

        // Declared as a workspace-level dep so a single copy is hoisted; used internally
        // by react-router-dom (which re-exports from it).
        'react-side-effect',
      ],
    },
    'packages/jaeger-ui': {
      ignore: [
        // Demo pages that are not part of the production bundle and have no tests.
        'src/demo/**',
        'src/utils/DraggableManager/demo/**',
      ],
      ignoreDependencies: [
        // Mapped to a CSS-modules stub in vitest.config.ts moduleNameMapper
        // (`'\\.(css|less)$': 'identity-obj-proxy'`); not imported as a module.
        'identity-obj-proxy',
      ],
      entry: [
        // AUTO-GENERATED from the Jaeger OpenAPI spec (`npm run generate:api-types`).
        // Treat as an entry point so knip considers all its exports intentionally public.
        'src/api/v3/generated-client.ts',
      ],
    },
    'packages/plexus': {
      ignore: [
        // Standalone demo app and fixture file; not part of the library's public API.
        'demo/**',
        'src/input.fixture.tsx',
      ],
      ignoreDependencies: [
        // antd is only used in demo/src/ which is listed in ignore above.
        // Knip cannot see the usage because the demo files are excluded.
        'antd',

        // Same as packages/jaeger-ui above.
        'identity-obj-proxy',
      ],
    },
  },
};

export default config;
