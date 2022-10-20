// Copyright (c) 2019 Uber Technologies, Inc.
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

import {
  CATEGORY_DENSITY_CHANGE,
  CATEGORY_DENSITY_SELECTION,
  CATEGORY_DOWNSTREAM_HOPS_CHANGE,
  CATEGORY_DOWNSTREAM_HOPS_SELECTION,
  CATEGORY_MATCH_INTERACTIONS,
  CATEGORY_TOGGLE_SHOW_OP,
  CATEGORY_UPSTREAM_HOPS_CHANGE,
  CATEGORY_UPSTREAM_HOPS_SELECTION,
  CATEGORY_VERTEX_INTERACTIONS,
  ACTION_DECREASE,
  ACTION_FOCUS_PATHS,
  ACTION_HIDE,
  ACTION_HIDE_CHILDREN,
  ACTION_HIDE_PARENTS,
  ACTION_INCREASE,
  ACTION_SET_FOCUS,
  ACTION_SET_OPERATION,
  ACTION_SHOW,
  ACTION_SHOW_CHILDREN,
  ACTION_SHOW_PARENTS,
  ACTION_VIEW_TRACES,
  trackDensityChange,
  trackFocusPaths,
  trackHide,
  trackHopChange,
  trackShow,
  trackSetFocus,
  trackShowMatches,
  trackToggleShowOp,
  trackVertexSetOperation,
  trackViewTraces,
} from './index.track';
import { EDdgDensity, EDirection } from '../../model/ddg/types';
import * as trackingUtils from '../../utils/tracking';

describe('DeepDependencies tracking', () => {
  let trackEvent;
  let warnSpy;

  beforeAll(() => {
    trackEvent = jest.spyOn(trackingUtils, 'trackEvent').mockImplementation();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  beforeEach(() => {
    trackEvent.mockClear();
    warnSpy.mockClear();
  });

  describe('traceDensityChange', () => {
    const intermediate = EDdgDensity.OnePerLevel;
    const moreConcise = EDdgDensity.UpstreamVsDownstream;
    const moreDetailed = EDdgDensity.PreventPathEntanglement;
    const options = [moreConcise, intermediate, moreDetailed].map(option => ({ option }));

    it('no-ops if given the same density twice', () => {
      trackDensityChange(moreConcise, moreConcise, options);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('warns without tracking if prevDensity does not exist in options', () => {
      trackDensityChange(moreConcise, moreDetailed, [{ option: moreDetailed }]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(moreConcise));
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('warns without tracking if nextDensity does not exist in options', () => {
      trackDensityChange(moreConcise, moreDetailed, [{ option: moreConcise }]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(moreDetailed));
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('warns twice if prevDensity and nextDensity both do not exist in options', () => {
      trackDensityChange(moreConcise, moreDetailed, []);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(moreConcise));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(moreDetailed));
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('tracks density increase and selection', () => {
      trackDensityChange(moreDetailed, moreConcise, options);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DENSITY_CHANGE, ACTION_INCREASE);
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DENSITY_SELECTION, moreConcise);
    });

    it('tracks density decrease and selection', () => {
      trackDensityChange(moreConcise, moreDetailed, options);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DENSITY_CHANGE, ACTION_DECREASE);
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DENSITY_SELECTION, moreDetailed);
    });
  });

  describe('trackFocusPaths', () => {
    it('calls trackViewTraces with the vertex category and focus paths action', () => {
      trackFocusPaths();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, ACTION_FOCUS_PATHS);
    });
  });

  describe('trackHide', () => {
    const testTable = [
      [ACTION_HIDE, undefined],
      [ACTION_HIDE_PARENTS, EDirection.Upstream],
      [ACTION_HIDE_CHILDREN, EDirection.Downstream],
    ];

    it.each(testTable)(
      'calls trackEvent with the vertex category and %p action when direction is %p',
      (action, direction) => {
        trackHide(direction);
        expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, action);
      }
    );
  });

  describe('trackHopChange', () => {
    const largerPosDistance = 6;
    const largerNegDistance = -1 * largerPosDistance;
    const smallerPosDistance = 2;
    const smallerNegDistance = -1 * smallerPosDistance;
    const testTable = [
      [
        ACTION_DECREASE,
        'Upstream',
        largerPosDistance,
        smallerPosDistance,
        CATEGORY_UPSTREAM_HOPS_SELECTION,
        CATEGORY_UPSTREAM_HOPS_CHANGE,
      ],
      [
        ACTION_INCREASE,
        'Upstream',
        smallerPosDistance,
        largerPosDistance,
        CATEGORY_UPSTREAM_HOPS_SELECTION,
        CATEGORY_UPSTREAM_HOPS_CHANGE,
      ],
      [
        ACTION_DECREASE,
        'Downstream',
        largerNegDistance,
        smallerPosDistance,
        CATEGORY_DOWNSTREAM_HOPS_SELECTION,
        CATEGORY_DOWNSTREAM_HOPS_CHANGE,
      ],
      [
        ACTION_INCREASE,
        'Downstream',
        smallerNegDistance,
        largerPosDistance,
        CATEGORY_DOWNSTREAM_HOPS_SELECTION,
        CATEGORY_DOWNSTREAM_HOPS_CHANGE,
      ],
    ];

    it('no-ops if given the same distance twice', () => {
      trackHopChange(largerPosDistance, largerPosDistance, EDirection.Upstream);
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it.each(testTable)(
      'tracks %p in %p hop count',
      (
        changeAction,
        direction,
        prevFurthestFullDistance,
        nextFurthestFullDistance,
        selectionCategory,
        changeCategory
      ) => {
        trackHopChange(prevFurthestFullDistance, nextFurthestFullDistance, EDirection[direction]);
        expect(trackEvent).toHaveBeenCalledWith(selectionCategory, `${nextFurthestFullDistance}`);
        expect(trackEvent).toHaveBeenCalledWith(changeCategory, changeAction);
      }
    );
  });

  describe('trackSetFocus', () => {
    it('calls trackEvent with the vertex category and set focus action', () => {
      trackSetFocus();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, ACTION_SET_FOCUS);
    });
  });

  describe('trackShow', () => {
    const testTable = [
      [ACTION_SHOW_PARENTS, EDirection.Upstream],
      [ACTION_SHOW_CHILDREN, EDirection.Downstream],
    ];

    it.each(testTable)(
      'calls trackEvent with the vertex category and %p action when direction is %p',
      (action, direction) => {
        trackShow(direction);
        expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, action);
      }
    );
  });

  describe('trackShowMatches', () => {
    it('calls trackEvent with the match category and show action', () => {
      trackShowMatches();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_MATCH_INTERACTIONS, ACTION_SHOW);
    });
  });

  describe('trackToggleShowOp', () => {
    const testTable = [[ACTION_HIDE, 'hiding', false], [ACTION_SHOW, 'showing', true]];

    it.each(testTable)(
      'calls track event with the toggle show op category and %p action when %p op',
      (action, _verb, value) => {
        trackToggleShowOp(value);
        expect(trackEvent).toHaveBeenCalledWith(CATEGORY_TOGGLE_SHOW_OP, action);
      }
    );
  });

  describe('trackVertexSetOperation', () => {
    it('calls trackEvent with the match category and show action', () => {
      trackVertexSetOperation();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, ACTION_SET_OPERATION);
    });
  });

  describe('trackViewTraces', () => {
    it('calls trackViewTraces with the vertex category and view traces action', () => {
      trackViewTraces();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VERTEX_INTERACTIONS, ACTION_VIEW_TRACES);
    });
  });
});
