// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import prefixUrl from '../prefix-url';
import defaultPluginsConfig from '../../constants/default-plugins-config';
import type { PluginsConfig } from '../../types/config';

// TODO(joe): change to /static/plugins when query service is ready
const PLUGINS_URL_PREFIX = '/static';

function convPluginUrl(url) {
  const mappedUrl = prefixUrl(`${PLUGINS_URL_PREFIX}/${url}`);
  return mappedUrl.replace(/\/\//g, '/');
}

/**
 * Merge defautls with the embedded UI config plugins.options, prefering the
 * embedded UI config over the defaults. Do not merge `sources`, simply prefer
 * the embedded UI config.
 */
export default function getPluginsConfig(plugins: ?PluginsConfig) {
  if (!plugins) {
    return null;
  }
  const options = {
    ...defaultPluginsConfig.options,
    ...plugins.options,
  };
  let sources = plugins.sources;
  if (Array.isArray(sources)) {
    sources = sources.map(pluginConfig => {
      const rv = {};
      if (Array.isArray(pluginConfig.css)) {
        rv.css = pluginConfig.css.map(convPluginUrl);
      }
      if (Array.isArray(pluginConfig.js)) {
        rv.js = pluginConfig.js.map(convPluginUrl);
      }
      return rv;
    });
  }
  return { ...plugins, sources, options };
}
