// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import {
  getTracePageLink,
  getUrl,
  parseLayoutSettingsFromUrl,
  stringifyLayoutSettings,
  stripLayoutSettingParam,
  stripLayoutSettings,
} from '.';

describe('TracePage/url', () => {
  const traceID = 'trace-id';
  const uiFind = 'ui-find';

  describe('layout settings', () => {
    it.each([
      ['', null, null],
      ['?timeline=on&sidebar=inline', true, 'inline'],
      ['timeline=off&sidebar=sidepanel', false, 'sidepanel'],
      ['?timeline=maybe&sidebar=toString', null, null],
      ['?timeline=&sidebar', null, null],
      ['?timeline=off', false, null],
      ['?sidebar=inline', null, 'inline'],
      ['?timeline=off&timeline=on&sidebar=inline&sidebar=sidepanel', false, 'inline'],
      ['?timeline=maybe&timeline=on&sidebar=invalid&sidebar=inline', null, null],
    ])('parses %s', (search, timelineBarsVisible, detailPanelMode) => {
      expect(parseLayoutSettingsFromUrl(search)).toEqual({ timelineBarsVisible, detailPanelMode });
    });

    it.each([
      {},
      { timelineBarsVisible: true },
      { timelineBarsVisible: false, detailPanelMode: 'inline' },
      { timelineBarsVisible: true, detailPanelMode: 'sidepanel' },
      { timelineBarsVisible: null, detailPanelMode: null },
    ])('round-trips partial settings %j', settings => {
      const search = queryString.stringify(stringifyLayoutSettings(settings));
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: null,
        ...settings,
      });
    });

    it.each(['?', ''])('removes only the selected override with prefix %j', prefix => {
      const search = `${prefix}timeline=off&sidebar=sidepanel&uiFind=a%26b&tag=one&tag=two`;
      expect(queryString.parse(stripLayoutSettingParam(search, 'timelineBarsVisible'))).toEqual({
        sidebar: 'sidepanel',
        uiFind: 'a&b',
        tag: ['one', 'two'],
      });
      expect(queryString.parse(stripLayoutSettingParam(search, 'detailPanelMode'))).toEqual({
        timeline: 'off',
        uiFind: 'a&b',
        tag: ['one', 'two'],
      });
      const stripped = stripLayoutSettings(search);
      expect(queryString.parse(stripped)).toEqual({ uiFind: 'a&b', tag: ['one', 'two'] });
      expect(stripped.startsWith('?')).toBe(Boolean(prefix));
    });

    it('preserves an unchanged query exactly', () => {
      const search = '?uiFind=a%20b&tag=z&tag=a';
      expect(stripLayoutSettings(search)).toBe(search);
      expect(stripLayoutSettingParam(search, 'timelineBarsVisible')).toBe(search);
    });

    it('returns an empty query after removing the last override', () => {
      expect(stripLayoutSettingParam('?timeline=off', 'timelineBarsVisible')).toBe('');
      expect(stripLayoutSettings('?timeline=off&sidebar=inline')).toBe('');
    });

    it('adds settings to links while preserving encoded IDs, search and router state', () => {
      const id = 'trace/with ?#%';
      const state = { fromSearch: '/search?service=frontend' };
      const settings = { timelineBarsVisible: false, detailPanelMode: 'sidepanel' };
      const query = 'sidebar=sidepanel&timeline=off&uiFind=a%26b';
      expect(getUrl(id, 'a&b', settings)).toBe(`/trace/${encodeURIComponent(id)}?${query}`);
      expect(getTracePageLink(id, state, 'a&b', settings)).toEqual({
        pathname: `/trace/${encodeURIComponent(id)}`,
        state,
        search: query,
      });
      expect(getUrl(traceID, undefined, settings)).toBe('/trace/trace-id?sidebar=sidepanel&timeline=off');
      expect(getTracePageLink(traceID, state, undefined, { timelineBarsVisible: false })).toEqual({
        pathname: '/trace/trace-id',
        state,
        search: 'timeline=off',
      });
      expect(getTracePageLink(traceID, state, undefined, {})).toEqual({
        pathname: '/trace/trace-id',
        state,
      });
    });
  });

  describe('getUrl', () => {
    it('includes traceID without uiFind', () => {
      expect(getUrl(traceID)).toBe(`/trace/${traceID}`);
    });

    it('includes traceID and uiFind', () => {
      expect(getUrl(traceID, uiFind)).toBe(`/trace/${traceID}?uiFind=${uiFind}`);
    });
  });

  describe('getTracePageLink', () => {
    const state = {
      fromSearch: 'some-url',
    };

    it('passes provided state with correct pathname, without uiFind', () => {
      expect(getTracePageLink(traceID, state)).toEqual({
        state,
        pathname: getUrl(traceID),
      });
    });

    it('passes provided state with correct pathname with uiFind', () => {
      expect(getTracePageLink(traceID, state, uiFind)).toEqual({
        state,
        pathname: getUrl(traceID),
        search: `uiFind=${uiFind}`,
      });
    });
  });
});
