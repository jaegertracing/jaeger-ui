// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getConfig from './get-config';
import { TScript } from '../../types/config';

export default function processScripts() {
  const scripts = getConfig().scripts;
  if (scripts) {
    scripts.forEach((script: TScript) => {
      if (script.type === 'inline') {
        const textElem = document.createTextNode(script.text);
        const scriptElem = document.createElement('script');
        scriptElem.append(textElem);
        document.body.appendChild(scriptElem);
      }
    });
  }
}
