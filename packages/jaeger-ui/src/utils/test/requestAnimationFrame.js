// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const DEFAULT_ELAPSE = 0;

export default function requestAnimationFrame(callback) {
  return setTimeout(callback, DEFAULT_ELAPSE);
}

export function cancelAnimationFrame(id) {
  return clearTimeout(id);
}

export function polyfill(target, msElapse = DEFAULT_ELAPSE) {
  const _target = target || global;
  if (!_target.requestAnimationFrame) {
    if (msElapse === DEFAULT_ELAPSE) {
      _target.requestAnimationFrame = requestAnimationFrame;
    } else {
      _target.requestAnimationFrame = callback => setTimeout(callback, msElapse);
    }
  }
  if (!_target.cancelAnimationFrame) {
    _target.cancelAnimationFrame = cancelAnimationFrame;
  }
}
