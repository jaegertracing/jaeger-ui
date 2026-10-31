// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import defaultVersion from '../../constants/default-version';
import { getVersionInfo } from '../constants';
import { version as packageVersion } from '../../../package.json';

let haveWarnedFactoryFn = false;

/** Where a build came from, for the two artifacts that make up a running Jaeger. */
export type VersionInfo = {
  backend: {
    /** Version tag the binary was built with; `dev` when the build set none. */
    version: string;
    /** Commit the binary was built from. A distribution may prefix it, as in `myorg/<sha>`. */
    commit: string;
    /** When the binary was built, ISO 8601. */
    buildDate: string;
  };
  frontend: {
    /** Version of this bundle, from the jaeger-ui package. */
    version: string;
    /** Commit this bundle was built from, empty when the build did not record one. */
    commit: string;
    /** Whether that build came from a tree with uncommitted changes. */
    modified: boolean;
  };
};

// scripts/get-build-info.js describes the bundle at build time and the result is injected as
// REACT_APP_VSN_STATE, which getVersionInfo returns as a JSON string. A build that skipped the script
// injects nothing, which is why the package version is imported as a fallback.
type BuildInfo = {
  version?: string;
  objName?: string;
  changed?: { hasChanged?: boolean };
};

function frontendVersion(): VersionInfo['frontend'] {
  let build: BuildInfo = {};
  try {
    build = JSON.parse(getVersionInfo() || '{}') ?? {};
  } catch {
    // Nothing injected, or not JSON: the package version is then all that is known.
  }
  return {
    version: build.version || packageVersion,
    commit: typeof build.objName === 'string' ? build.objName.trim() : '',
    modified: Boolean(build.changed?.hasChanged),
  };
}

// The backend reports itself through window.getJaegerVersion(), which the Jaeger server writes into
// index.html; its field names are that wire format.
function backendVersion(): VersionInfo['backend'] {
  const getJaegerVersion = window.getJaegerVersion;
  if (typeof getJaegerVersion !== 'function') {
    if (!haveWarnedFactoryFn) {
      console.warn('Embedded version information not available');
      haveWarnedFactoryFn = true;
    }
    return { version: '', commit: '', buildDate: '' };
  }
  const embedded = getJaegerVersion() ?? defaultVersion;
  return {
    version: embedded.gitVersion ?? '',
    commit: embedded.gitCommit ?? '',
    buildDate: embedded.buildDate ?? '',
  };
}

/**
 * Version of both halves of a running Jaeger: the backend, which embeds its build info into
 * index.html, and this UI bundle, which records its own at build time. They arrive by unrelated routes
 * but answer the same question, so they are read in one place.
 *
 * frontend.version names the last release even when the bundle was built from a later commit, which is
 * what frontend.commit is for.
 */
export default function getVersion(): VersionInfo {
  return { backend: backendVersion(), frontend: frontendVersion() };
}
