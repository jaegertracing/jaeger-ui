// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import Combokeys from 'combokeys';

import keyboardMappings from './keyboard-mappings';

export type CombokeysHandler =
  | (() => void)
  | ((event: React.KeyboardEvent<any>) => void)
  | ((event: React.KeyboardEvent<any>, s: string) => void);

export type ShortcutCallbacks = {
  [name: string]: CombokeysHandler;
};

let instance: Combokeys | undefined;

function getInstance(): Combokeys {
  if (instance) {
    return instance;
  }
  const local = new Combokeys(document.body);
  instance = local;
  return local;
}

export function merge(callbacks: ShortcutCallbacks) {
  const inst = getInstance();
  Object.keys(callbacks).forEach(name => {
    const keysHandler = callbacks[name];
    if (keysHandler) {
      inst.bind(keyboardMappings[name].binding, keysHandler);
    }
  });
}

export function reset() {
  const combokeys = getInstance();
  combokeys.reset();
}
