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

import Combokeys from 'combokeys';

export type CombokeysHandler =
  | (() => void)
  | ((SyntheticKeyboardEvent<any>) => void)
  | ((SyntheticKeyboardEvent<any>, string) => void);

type CombokeysType = {
  bind: (string | string[], CombokeysHandler) => void,
  reset: () => void,
};

export type ShortcutCallbacks = {
  scrollPageDown: CombokeysHandler,
  scrollPageUp: CombokeysHandler,
  scrollToNextVisibleSpan: CombokeysHandler,
  scrollToPrevVisibleSpan: CombokeysHandler,
  // view range
  panLeft: CombokeysHandler,
  panLeftFast: CombokeysHandler,
  panRight: CombokeysHandler,
  panRightFast: CombokeysHandler,
  zoomIn: CombokeysHandler,
  zoomInFast: CombokeysHandler,
  zoomOut: CombokeysHandler,
  zoomOutFast: CombokeysHandler,
};

export const kbdMappings = {
  scrollPageDown: 's',
  scrollPageUp: 'w',
  scrollToNextVisibleSpan: 'f',
  scrollToPrevVisibleSpan: 'b',
  panLeft: ['a', 'left'],
  panLeftFast: ['shift+a', 'shift+left'],
  panRight: ['d', 'right'],
  panRightFast: ['shift+d', 'shift+right'],
  zoomIn: 'up',
  zoomInFast: 'shift+up',
  zoomOut: 'down',
  zoomOutFast: 'shift+down',
};

let instance: ?CombokeysType;

function getInstance(): CombokeysType {
  if (!instance) {
    instance = new Combokeys(document.body);
  }
  return instance;
}

export function init(callbacks: ShortcutCallbacks) {
  const combokeys = getInstance();
  combokeys.reset();
  Object.keys(kbdMappings).forEach(name => {
    combokeys.bind(kbdMappings[name], callbacks[name]);
  });
}

export function reset() {
  const combokeys = getInstance();
  combokeys.reset();
}
