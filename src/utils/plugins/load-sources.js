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

import Bluebird from 'bluebird';

import AssetsLoader from './AssetsLoader';
import type { PluginSources } from '../../types/config';

type LoadSourcesOptions = {
  sources: PluginSources,
  assetsLoader: AssetsLoader,
};

export type LoadSourcesResults = {
  css: Bluebird$Promise<Bluebird$PromiseInspection<string>[]>,
  js: Bluebird$Promise<Bluebird$PromiseInspection<string>[]>,
};

export default function loadSources({ sources, assetsLoader }: LoadSourcesOptions): LoadSourcesResults {
  const css =
    Array.isArray(sources.css) && sources.css.length
      ? Bluebird.all(sources.css.map(cssSource => assetsLoader.addCssLink(cssSource).reflect()))
      : [];
  const js =
    Array.isArray(sources.js) && sources.js.length
      ? Bluebird.all(sources.js.map(jsSource => assetsLoader.loadJavaScriptAsText(jsSource).reflect()))
      : [];
  return { css, js };
}
