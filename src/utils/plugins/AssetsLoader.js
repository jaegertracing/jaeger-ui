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
import loadStylsheet from 'ffxnz-load-stylesheet';
import fetch from 'isomorphic-fetch';

import type { PluginsOptions } from '../../types/config';

export default class AssetsLoader {
  _options: PluginsOptions;
  _isBailed: boolean;
  _alreadyStartedJs: Map<string, ?Bluebird<string>>;

  constructor(options: PluginsOptions) {
    this._options = options;
    this._isBailed = false;
    this._alreadyStartedJs = new Map();
  }

  addCssLink(url: string): Bluebird$Promise<string> {
    if (this._isBailed) {
      const msg = `Skipping ${url} because the plugin inititialization has bailed`;
      // eslint-disable-next-line no-console
      console.error(msg);
      return Bluebird.reject(new Error(msg));
    }
    const { timeoutMs } = this._options;
    let p = Bluebird.resolve(loadStylsheet(url));
    p = p.catch(() => {
      throw new Error(`Failed to load CSS file: "${url}"`);
    });
    if (typeof timeoutMs === 'number' && p.isPending()) {
      p = p.timeout(timeoutMs);
    }
    return p;
  }

  loadJavaScriptAsText(url: string): Bluebird$Promise<string> {
    if (this._isBailed) {
      const msg = `Skipping ${url} because the plugin inititialization has bailed`;
      console.error(msg);
      return Bluebird.reject(new Error(msg));
    }
    const cached = this._alreadyStartedJs.get(url);
    if (cached != null) {
      return cached;
    }
    const { timeoutMs } = this._options;
    let promise = Bluebird.resolve(
      fetch(url, {
        credentials: 'include',
      })
    );
    if (typeof timeoutMs === 'number') {
      promise = promise.timeout(timeoutMs);
    }
    promise = promise
      .then(response => {
        if (response.status >= 400) {
          if (this._options.bail) {
            this._isBailed = true;
            console.error(`Bailing after error loading JavaScript file: "${url}"`);
          }
          throw new Error(`${response.status} - ${response.statusText} - URL: "${url}"`);
        }
        return response.text();
      })
      .then(
        text => `
        (function() {
          /* plugin source loaded from URL: "${url}" */
          ${text};
          return exports;
        })();
      `
      );
    this._alreadyStartedJs.set(url, promise);
    return promise;
  }
}
