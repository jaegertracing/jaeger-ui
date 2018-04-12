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

export type PluginMenuItem = {
  text: string,
  to: string,
};

// type Reducer = (any, { }) => any;

export type PluginRoute = {
  path: string,
  component: Function,
  connectToStore?: {
    stateFieldsToProps: string[],
  },
};

export type PluginModule = {
  formatVersion: string,
  name: string,
  pluginVersion: string,
  license: string,
  description: string,
  url: string,
  init?: () => void,
  // reducers?: { [string]: Reducer },
  menuItems?: PluginMenuItem[],
  routes?: PluginRoute[],
};
