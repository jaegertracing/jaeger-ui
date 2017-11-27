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

export const menu = [];

export const routes = [];

export function processLoadedPlugin(plugin) {
  if (Array.isArray(plugin.menuConfig)) {
    menu.push(
      ...plugin.menuConfig.map(item => {
        const path = prefixUrl(item.path);

        return { ...item, key: path, to: path };
      })
    );
  }
  if (Array.isArray(plugin.routes)) {
    routes.push(...plugin.routes);
  }
}
