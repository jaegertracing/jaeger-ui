// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  getTracePageLink,
  getUrl,
  stringifySettings,
  rebaseSettings,
  stripSettingParam,
  parseSettingsFromUrl,
} from '.';
import prefixUrl from '../../../utils/prefix-url';

describe('TracePage/url', () => {
  const traceID = 'trace-id';
  const uiFind = 'ui-find';

  describe('stringifySettings', () => {
    it('handles empty settings', () => {
      expect(stringifySettings({})).toEqual({});
    });

    it('handles timeline settings', () => {
      expect(stringifySettings({ timelineBarsVisible: true })).toEqual({ timeline: 'on' });
      expect(stringifySettings({ timelineBarsVisible: false })).toEqual({ timeline: 'off' });
      expect(stringifySettings({ timelineBarsVisible: null })).toEqual({});
    });

    it('handles sidebar settings', () => {
      expect(stringifySettings({ detailPanelMode: 'sidepanel' })).toEqual({ sidebar: 'sidepanel' });
      expect(stringifySettings({ detailPanelMode: 'inline' })).toEqual({ sidebar: 'inline' });
      expect(stringifySettings({ detailPanelMode: null })).toEqual({});
    });

    it('handles combined settings', () => {
      expect(stringifySettings({ timelineBarsVisible: true, detailPanelMode: 'sidepanel' })).toEqual({
        timeline: 'on',
        sidebar: 'sidepanel',
      });
    });
  });

  describe('rebaseSettings', () => {
    it('removes settings while preserving others', () => {
      const search = '?uiFind=foo&timeline=on&sidebar=sidepanel';
      expect(rebaseSettings(search)).toBe('?uiFind=foo');
    });

    it('returns empty string if only settings were present', () => {
      const search = '?timeline=on&sidebar=sidepanel';
      expect(rebaseSettings(search)).toBe('');
    });

    it('handles search without settings', () => {
      const search = '?uiFind=foo';
      expect(rebaseSettings(search)).toBe('?uiFind=foo');
    });
  });

  describe('stripSettingParam', () => {
    it('strips only the timeline param, leaving sidebar intact', () => {
      expect(stripSettingParam('?uiFind=foo&timeline=on&sidebar=sidepanel', 'timelineBarsVisible')).toBe(
        '?sidebar=sidepanel&uiFind=foo'
      );
    });

    it('strips only the sidebar param, leaving timeline intact', () => {
      expect(stripSettingParam('?uiFind=foo&timeline=on&sidebar=sidepanel', 'detailPanelMode')).toBe(
        '?timeline=on&uiFind=foo'
      );
    });

    it('returns empty string if only that param was present', () => {
      expect(stripSettingParam('?timeline=on', 'timelineBarsVisible')).toBe('');
    });

    it('is a no-op when the targeted param is absent', () => {
      expect(stripSettingParam('?uiFind=foo', 'timelineBarsVisible')).toBe('?uiFind=foo');
    });
  });

  describe('getUrl', () => {
    it('includes traceID without uiFind', () => {
      expect(getUrl(traceID)).toBe(prefixUrl(`/trace/${traceID}`));
    });

    it('includes traceID and uiFind', () => {
      expect(getUrl(traceID, uiFind)).toBe(prefixUrl(`/trace/${traceID}?uiFind=${uiFind}`));
    });

    it('includes settings', () => {
      expect(getUrl(traceID, undefined, { timelineBarsVisible: true })).toBe(
        prefixUrl(`/trace/${traceID}?timeline=on`)
      );
    });

    it('includes both uiFind and settings', () => {
      const url = getUrl(traceID, uiFind, { detailPanelMode: 'sidepanel' });
      expect(url).toContain('uiFind=ui-find');
      expect(url).toContain('sidebar=sidepanel');
    });
  });

  describe('getTracePageLink', () => {
    const state = {
      fromSearch: 'some-url',
    };

    it('passes provided state with correct pathname, without uiFind', () => {
      expect(getTracePageLink(traceID, state)).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
      });
    });

    it('passes provided state with correct pathname with uiFind', () => {
      expect(getTracePageLink(traceID, state, uiFind)).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: `uiFind=${uiFind}`,
      });
    });

    it('includes settings', () => {
      expect(getTracePageLink(traceID, state, undefined, { timelineBarsVisible: false })).toEqual({
        state,
        pathname: prefixUrl(`/trace/${traceID}`),
        search: 'timeline=off',
      });
    });
  });

  describe('parseSettingsFromUrl', () => {
    it('parses settings correctly', () => {
      const search = '?timeline=off&sidebar=sidepanel';
      expect(parseSettingsFromUrl(search)).toEqual({
        timelineBarsVisible: false,
        detailPanelMode: 'sidepanel',
      });
    });

    it('handles missing settings', () => {
      expect(parseSettingsFromUrl('')).toEqual({
        timelineBarsVisible: null,
        detailPanelMode: null,
      });
    });
  });
});
