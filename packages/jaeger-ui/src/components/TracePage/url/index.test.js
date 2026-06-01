// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import {
  getTracePageLink,
  getUrl,
  stringifyLayoutSettings,
  stripLayoutSettings,
  stripLayoutSettingParam,
  parseLayoutSettingsFromUrl,
} from '.';
import prefixUrl from '../../../utils/prefix-url';

describe('TracePage/url', () => {
  const traceID = 'trace-id';
  const uiFind = 'ui-find';

  describe('stringifyLayoutSettings', () => {
    it('handles empty settings', () => {
      expect(stringifyLayoutSettings({})).toEqual({});
    });

    it('handles timeline settings', () => {
      expect(stringifyLayoutSettings({ timelineBarsVisible: true })).toEqual({ timeline: 'on' });
      expect(stringifyLayoutSettings({ timelineBarsVisible: false })).toEqual({ timeline: 'off' });
      expect(stringifyLayoutSettings({ timelineBarsVisible: null })).toEqual({});
    });

    it('handles sidebar settings', () => {
      expect(stringifyLayoutSettings({ detailPanelMode: 'sidepanel' })).toEqual({ sidebar: 'sidepanel' });
      expect(stringifyLayoutSettings({ detailPanelMode: 'inline' })).toEqual({ sidebar: 'inline' });
      expect(stringifyLayoutSettings({ detailPanelMode: null })).toEqual({});
    });

    it('handles combined settings', () => {
      expect(stringifyLayoutSettings({ timelineBarsVisible: true, detailPanelMode: 'sidepanel' })).toEqual({
        timeline: 'on',
        sidebar: 'sidepanel',
      });
    });
  });

  describe('stripLayoutSettings', () => {
    it('removes all layout params while preserving others', () => {
      const search = '?uiFind=foo&timeline=on&sidebar=sidepanel';
      expect(stripLayoutSettings(search)).toBe('?uiFind=foo');
    });

    it('removes all layout params from a raw query string (no leading ?)', () => {
      expect(stripLayoutSettings('uiFind=foo&timeline=on&sidebar=sidepanel')).toBe('uiFind=foo');
    });

    it('returns empty string if only layout params were present', () => {
      const search = '?timeline=on&sidebar=sidepanel';
      expect(stripLayoutSettings(search)).toBe('');
    });

    it('returns empty string for raw query with only layout params (no leading ?)', () => {
      expect(stripLayoutSettings('timeline=on&sidebar=sidepanel')).toBe('');
    });

    it('is a no-op when no layout params are present', () => {
      const search = '?uiFind=foo';
      expect(stripLayoutSettings(search)).toBe('?uiFind=foo');
    });
  });

  describe('stripLayoutSettingParam', () => {
    it('strips only the timeline param, leaving sidebar and uiFind intact', () => {
      const result = stripLayoutSettingParam(
        '?uiFind=foo&timeline=on&sidebar=sidepanel',
        'timelineBarsVisible'
      );
      expect(queryString.parse(result)).toEqual({ sidebar: 'sidepanel', uiFind: 'foo' });
    });

    it('strips timeline from a raw query string (no leading ?)', () => {
      const result = stripLayoutSettingParam(
        'uiFind=foo&timeline=on&sidebar=sidepanel',
        'timelineBarsVisible'
      );
      expect(queryString.parse(result)).toEqual({ sidebar: 'sidepanel', uiFind: 'foo' });
    });

    it('strips only the sidebar param, leaving timeline and uiFind intact', () => {
      const result = stripLayoutSettingParam('?uiFind=foo&timeline=on&sidebar=sidepanel', 'detailPanelMode');
      expect(queryString.parse(result)).toEqual({ timeline: 'on', uiFind: 'foo' });
    });

    it('strips sidebar from a raw query string (no leading ?)', () => {
      const result = stripLayoutSettingParam('uiFind=foo&timeline=on&sidebar=sidepanel', 'detailPanelMode');
      expect(queryString.parse(result)).toEqual({ timeline: 'on', uiFind: 'foo' });
    });

    it('returns empty string if only that param was present', () => {
      expect(stripLayoutSettingParam('?timeline=on', 'timelineBarsVisible')).toBe('');
    });

    it('returns the original search string unchanged when the targeted param is absent', () => {
      const search = '?uiFind=foo';
      expect(stripLayoutSettingParam(search, 'timelineBarsVisible')).toBe(search);
    });
  });

  describe('getUrl', () => {
    it('includes traceID without uiFind', () => {
      expect(getUrl(traceID)).toBe(prefixUrl(`/trace/${traceID}`));
    });

    it('includes traceID and uiFind (positional)', () => {
      expect(getUrl(traceID, uiFind)).toBe(`${prefixUrl(`/trace/${traceID}`)}?uiFind=${uiFind}`);
    });

    it('includes traceID and uiFind (options)', () => {
      expect(getUrl(traceID, { uiFind })).toBe(`${prefixUrl(`/trace/${traceID}`)}?uiFind=${uiFind}`);
    });

    it('includes settings (positional)', () => {
      expect(getUrl(traceID, undefined, { timelineBarsVisible: true })).toBe(
        `${prefixUrl(`/trace/${traceID}`)}?timeline=on`
      );
    });

    it('includes settings (options)', () => {
      expect(getUrl(traceID, { settings: { timelineBarsVisible: true } })).toBe(
        `${prefixUrl(`/trace/${traceID}`)}?timeline=on`
      );
    });

    it('includes both uiFind and settings (positional)', () => {
      const url = getUrl(traceID, uiFind, { detailPanelMode: 'sidepanel' });
      expect(url).toContain('uiFind=ui-find');
      expect(url).toContain('sidebar=sidepanel');
    });

    it('includes both uiFind and settings (options)', () => {
      const url = getUrl(traceID, { uiFind, settings: { detailPanelMode: 'sidepanel' } });
      expect(url).toContain('uiFind=ui-find');
      expect(url).toContain('sidebar=sidepanel');
    });
  });

  describe('getTracePageLink', () => {
    const state = {
      fromSearch: 'some-url',
    };

    it('passes provided state with correct pathname, without uiFind (positional)', () => {
      expect(getTracePageLink(traceID, state)).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
      });
    });

    it('passes provided state with correct pathname, without uiFind (options)', () => {
      expect(getTracePageLink(traceID, { state })).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
      });
    });

    it('treats an empty options object {} as an options bag, not as LocationState', () => {
      expect(getTracePageLink(traceID, {})).toEqual({
        state: undefined,
        pathname: prefixUrl(`/trace/${traceID}`),
      });
    });

    it('passes provided state with correct pathname with uiFind (positional)', () => {
      expect(getTracePageLink(traceID, state, uiFind)).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: `uiFind=${uiFind}`,
      });
    });

    it('passes provided state with correct pathname with uiFind (options)', () => {
      expect(getTracePageLink(traceID, { state, uiFind })).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: `uiFind=${uiFind}`,
      });
    });

    it('includes settings (positional)', () => {
      expect(getTracePageLink(traceID, state, undefined, { timelineBarsVisible: false })).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: 'timeline=off',
      });
    });

    it('includes settings (options)', () => {
      expect(getTracePageLink(traceID, { state, settings: { timelineBarsVisible: false } })).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: 'timeline=off',
      });
    });
  });

  describe('parseLayoutSettingsFromUrl', () => {
    it('parses timeline=off and sidebar=sidepanel', () => {
      const search = '?timeline=off&sidebar=sidepanel';
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: false,
        detailPanelMode: 'sidepanel',
      });
    });

    it('parses timeline=on and sidebar=inline', () => {
      const search = '?timeline=on&sidebar=inline';
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: true,
        detailPanelMode: 'inline',
      });
    });

    it('handles missing settings', () => {
      expect(parseLayoutSettingsFromUrl('')).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: null,
      });
    });

    it('handles unrecognized values by falling back to null', () => {
      const search = '?timeline=maybe&sidebar=bottom';
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: null,
      });
    });

    it('picks the first occurrence of a duplicate key (the module always uses index [0])', () => {
      const search = '?timeline=off&timeline=on&sidebar=sidepanel&sidebar=inline';
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: false,
        detailPanelMode: 'sidepanel',
      });
    });

    it('falls back to null when a param is present but empty (?timeline=)', () => {
      expect(parseLayoutSettingsFromUrl('?timeline=&sidebar=')).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: null,
      });
    });

    it('handles sidebar duplicate keys independently of timeline', () => {
      const search = '?sidebar=inline&sidebar=sidepanel';
      expect(parseLayoutSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: 'inline',
      });
    });
  });
});
