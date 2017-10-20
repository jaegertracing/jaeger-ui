// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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

const kbdMappings = {
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
