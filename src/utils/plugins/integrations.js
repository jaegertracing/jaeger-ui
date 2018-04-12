// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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

import type { PluginIntegrations } from './local-types';
import prefixUrl from '../prefix-url';
import type { PluginModule } from '../../types/plugin-module';

const integrations: PluginIntegrations = {
  menuItems: [],
  routes: [],
};

export default integrations;

export function integratePlugin(plugin: PluginModule) {
  if (Array.isArray(plugin.menuItems)) {
    integrations.menuItems.push(
      ...plugin.menuItems.map(item => {
        const path = prefixUrl(item.to);
        return { ...item, to: path };
      })
    );
  }
  if (Array.isArray(plugin.routes)) {
    integrations.routes.push(...plugin.routes);
  }
}
