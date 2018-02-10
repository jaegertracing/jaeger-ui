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

/* eslint-disable camelcase */

import prefixUrl from '../prefix-url';

const UNKONWN_SYM = { sym: '??', word: '??' };

const NAV_SYMBOLS = [
  { sym: 'dp', word: 'depdencies', rx: /^\/dep/i },
  { sym: 'tr', word: 'trace', rx: /^\/trace/i },
  { sym: 'sd', word: 'search', rx: /^\/search\?./i },
  { sym: 'sr', word: 'search', rx: /^\/search/i },
  { sym: 'rt', word: 'home', rx: /^\/$/ },
];

const FETCH_SYMBOLS = [
  { sym: 'svc', word: '', rx: /^\/api\/services$/i },
  { sym: 'op', word: '', rx: /^\/api\/.*?operations$/i },
  { sym: 'sr', word: '', rx: /^\/api\/traces\?/i },
  { sym: 'tr', word: '', rx: /^\/api\/traces\/./i },
  { sym: 'dp', word: '', rx: /^\/api\/dep/i },
  { sym: '__IGNORE__', word: '', rx: /\.js(\.map)?$/i },
];

// eslint-disable-next-line no-console
const warn = console.warn.bind(console);

const origin = window.location.origin + prefixUrl('');

function truncate(str, len, front = false) {
  if (str.length > len) {
    if (!front) {
      return `${str.slice(0, len - 1)}~`;
    }
    return `~${str.slice(1 - len)}`;
  }
  return str;
}

function getSym(syms, str) {
  for (let i = 0; i < syms.length; i++) {
    const { rx } = syms[i];
    if (rx.test(str)) {
      return syms[i];
    }
  }
  warn(`Unable to find symbol for: "${str}"`);
  return UNKONWN_SYM;
}

function convNav(to: string) {
  const sym = getSym(NAV_SYMBOLS, to);
  return `\n\n${sym.sym}\n`;
}

function convFetch(data: { url: string, status_code: number }) {
  const { url, status_code } = data;
  const statusStr = status_code === 200 ? '' : `|${status_code}`;
  const sym = getSym(FETCH_SYMBOLS, url);
  if (sym.sym === '__IGNORE__') {
    return '';
  }
  return `[${sym.sym}${statusStr}]`;
}

function convBreadcrumbs(crumbs) {
  let joiner: string[] = [];
  for (let i = 0; i < crumbs.length; i++) {
    const c = crumbs[i];
    const cStart = c.category.split('.')[0];
    switch (cStart) {
      case 'fetch':
        joiner.push(convFetch(c.data));
        break;

      case 'ui':
        joiner.push(c.category[3]);
        break;

      case 'sentry': {
        let msg = c.message;
        const j = msg.indexOf(':');
        let start = msg.slice(0, j + 1);
        start = start.replace(/error/gi, '').replace(':', '!');
        msg = truncate(`\n${start}${msg.slice(j + 1)}\n`, 60);
        joiner.push(msg);
        break;
      }

      case 'navigation':
        joiner.push(convNav(c.data.to));
        break;

      default:
      // skip
    }
  }
  joiner = joiner.filter(Boolean);
  // combine repeating UI chars, e.g. ["c","c","c","c"] -> ["c","4"]
  let c = '';
  let ci = -1;
  const compacted = joiner.reduce((accum: string[], value: string, j: number): string[] => {
    if (value === c) {
      return accum;
    }
    if (c) {
      if (j - ci > 1) {
        accum.push(String(j - ci));
      }
      c = '';
      ci = -1;
    }
    accum.push(value);
    if (value.length === 1) {
      c = value;
      ci = j;
    }
    return accum;
  }, []);
  if (c && ci !== joiner.length - 1) {
    compacted.push(String(joiner.length - 1 - ci));
  }
  return compacted
    .join('')
    .trim()
    .replace(/\n\n\n/g, '\n');
}

function convException(errValue) {
  const type = errValue.type.replace(/error/gi, '');
  const message = truncate(`${type}! ${errValue.value}`, 149);
  const frames = errValue.stacktrace.frames.map(fr => {
    const filename = fr.filename.replace(origin, '').replace(/^\/static\/js\//i, '');
    const fn = fr.function;
    return { filename, fn };
  });
  const joiner = [];
  let lastFile = '';
  for (let i = frames.length - 1; i >= 0; i--) {
    const { filename, fn } = frames[i];
    if (lastFile !== filename) {
      joiner.push(`> ${filename}`);
      lastFile = filename;
    }
    joiner.push(fn);
  }
  return { message, stack: joiner.join('\n') };
}

function getLabel(message, page, duration, git, crumbs) {
  const header = [message, page, duration, git].filter(Boolean).join('\n');
  return `${header}\n${truncate(crumbs, 498 - header.length, true)}`;
}

export default function convRavenToGa({ data }: RavenTransportOptions) {
  const { message, stack } = convException(data.exception.values[0]);
  const url = truncate(data.request.url.replace(origin, ''), 50);
  const { word: page } = getSym(NAV_SYMBOLS, url);
  const crumbs = convBreadcrumbs(data.breadcrumbs.values);
  const value = Math.round(data.extra['session:duration'] / 1000);
  const category = `jaeger/${page}/error`;
  let action = [message, url, stack].join('\n');
  action = truncate(action, 499);
  const label = getLabel(message, page, value, data.tags.git, crumbs);
  return {
    message,
    category,
    action,
    label,
    value,
  };
}
