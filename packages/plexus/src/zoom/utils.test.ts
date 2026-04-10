// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { zoomIdentity } from 'd3-zoom';
import {
  getScaleExtent,
  fitWithinContainer,
  constrainZoom,
  getZoomStyle,
  getZoomAttr,
  DEFAULT_SCALE_EXTENT,
} from './utils';

describe('zoom/utils', () => {
  describe('getScaleExtent', () => {
    it('returns a scale extent based on dimensions', () => {
      const width = 100;
      const height = 100;
      const viewWidth = 500;
      const viewHeight = 500;
      // getFittedScale = Math.max(0.03, Math.min(0.95 * 500 / 1.5 / 100, 0.95 * 500 / 1.5 / 100, 10))
      // 0.95 * 500 / 150 = 475 / 150 = 3.1666...
      const [min, max] = getScaleExtent(width, height, viewWidth, viewHeight);
      expect(min).toBeCloseTo(3.1666);
      expect(max).toBe(10);
    });

    it('caps min scale at SCALE_MIN', () => {
      const width = 10000;
      const height = 10000;
      const viewWidth = 100;
      const viewHeight = 100;
      // getFittedScale = Math.max(0.03, Math.min(0.95 * 100 / 1.5 / 10000, ...))
      // 0.95 * 100 / 15000 = 95 / 15000 = 0.00633...
      // Math.max(0.03, 0.00633) = 0.03
      const [min, max] = getScaleExtent(width, height, viewWidth, viewHeight);
      expect(min).toBe(DEFAULT_SCALE_EXTENT[0]);
      expect(max).toBe(DEFAULT_SCALE_EXTENT[1]);
    });

    it('caps min scale at SCALE_MAX', () => {
      const width = 1;
      const height = 1;
      const viewWidth = 1000;
      const viewHeight = 1000;
      // getFittedScale = Math.max(0.03, Math.min(0.95 * 1000 / 1.5 / 1, ..., 10))
      // 0.95 * 1000 / 1.5 = 950 / 1.5 = 633.33...
      // Math.min(633.33, 633.33, 10) = 10
      const [min, max] = getScaleExtent(width, height, viewWidth, viewHeight);
      expect(min).toBe(DEFAULT_SCALE_EXTENT[1]);
      expect(max).toBe(DEFAULT_SCALE_EXTENT[1]);
    });
  });

  describe('fitWithinContainer', () => {
    it('returns a zoom transform that centers content', () => {
      const width = 100;
      const height = 100;
      const viewWidth = 500;
      const viewHeight = 500;
      // getFittedScale = 3.1666...
      // scaledWidth = 316.66...
      // x = (500 - 316.66...) / 2 = 183.33 / 2 = 91.66...
      const transform = fitWithinContainer(width, height, viewWidth, viewHeight);
      expect(transform.k).toBeCloseTo(3.1666);
      expect(transform.x).toBeCloseTo(91.666);
      expect(transform.y).toBeCloseTo(91.666);
    });
  });

  describe('constrainZoom', () => {
    const width = 100;
    const height = 100;
    const viewWidth = 500;
    const viewHeight = 500;
    // fittedScale = 3.1666...
    // minX = -100 * k + 250
    // maxX = 250

    it('returns the same transform if within bounds', () => {
      const transform = zoomIdentity.translate(100, 100).scale(4);
      const constrained = constrainZoom(transform, width, height, viewWidth, viewHeight);
      expect(constrained.x).toBe(transform.x);
      expect(constrained.y).toBe(transform.y);
      expect(constrained.k).toBe(transform.k);
    });

    it('adjusts k if below fitted scale', () => {
      const transform = zoomIdentity.translate(100, 100).scale(1);
      const constrained = constrainZoom(transform, width, height, viewWidth, viewHeight);
      expect(constrained.k).toBeCloseTo(3.1666);
    });

    it('adjusts x if out of bounds', () => {
      const k = 4;
      // minX = -100 * 4 + 250 = -150
      // maxX = 250
      const transform = zoomIdentity.translate(300, 100).scale(k);
      const constrained = constrainZoom(transform, width, height, viewWidth, viewHeight);
      expect(constrained.x).toBe(250);

      const transform2 = zoomIdentity.translate(-200, 100).scale(k);
      const constrained2 = constrainZoom(transform2, width, height, viewWidth, viewHeight);
      expect(constrained2.x).toBe(-150);
    });

    it('adjusts y if out of bounds', () => {
      const k = 4;
      // minY = -100 * 4 + 250 = -150
      // maxY = 250
      const transform = zoomIdentity.translate(100, 300).scale(k);
      const constrained = constrainZoom(transform, width, height, viewWidth, viewHeight);
      expect(constrained.y).toBe(250);

      const transform2 = zoomIdentity.translate(100, -200).scale(k);
      const constrained2 = constrainZoom(transform2, width, height, viewWidth, viewHeight);
      expect(constrained2.y).toBe(-150);
    });
  });

  describe('getZoomStyle', () => {
    it('returns default style for null/undefined', () => {
      expect(getZoomStyle()).toEqual({
        transform: 'translate(0px, 0px) scale(1)',
        transformOrigin: '0 0',
      });
      expect(getZoomStyle(null)).toEqual({
        transform: 'translate(0px, 0px) scale(1)',
        transformOrigin: '0 0',
      });
      expect(getZoomStyle(undefined)).toEqual({
        transform: 'translate(0px, 0px) scale(1)',
        transformOrigin: '0 0',
      });
    });

    it('returns CSS properties for a valid transform', () => {
      const transform = zoomIdentity.translate(10.5, 20.8).scale(2.5);
      expect(getZoomStyle(transform)).toEqual({
        transform: 'translate(11px, 21px) scale(2.5)',
        transformOrigin: '0 0',
      });
    });
  });

  describe('getZoomAttr', () => {
    it('returns undefined for null/undefined', () => {
      expect(getZoomAttr()).toBeUndefined();
      expect(getZoomAttr(null)).toBeUndefined();
      expect(getZoomAttr(undefined)).toBeUndefined();
    });

    it('returns a string for a valid transform', () => {
      const transform = zoomIdentity.translate(10.5, 20.8).scale(2.5);
      expect(getZoomAttr(transform)).toBe('translate(11,21) scale(2.5)');
    });
  });

  describe('DEFAULT_SCALE_EXTENT', () => {
    it('is an array of [0.03, 10]', () => {
      expect(DEFAULT_SCALE_EXTENT).toEqual([0.03, 10]);
    });
  });
});
