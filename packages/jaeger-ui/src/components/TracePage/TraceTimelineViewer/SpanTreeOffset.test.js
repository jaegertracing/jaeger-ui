// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

jest.mock('../../../utils/span-ancestor-ids');

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  const specialRootID = 'root';
  let props;

  beforeEach(() => {
    spanAncestorIds.mockImplementation(() => [parentSpanID, rootSpanID]);
    props = {
      addHoverIndentGuideId: jest.fn(),
      hoverIndentGuideIds: new Set(),
      removeHoverIndentGuideId: jest.fn(),
      span: {
        hasChildren: false,
        spanID: ownSpanID,
      },
    };
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders only one .SpanTreeOffset--indentGuide for entire trace if span has no ancestors', () => {
      spanAncestorIds.mockReturnValue([]);
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(1);
      expect(indentGuides[0].getAttribute('data-ancestor-id')).toBe(specialRootID);
    });

    it('renders one .SpanTreeOffset--indentGuide per ancestor span, plus one for entire trace', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(3);
      expect(indentGuides[0].getAttribute('data-ancestor-id')).toBe(specialRootID);
      expect(indentGuides[1].getAttribute('data-ancestor-id')).toBe(rootSpanID);
      expect(indentGuides[2].getAttribute('data-ancestor-id')).toBe(parentSpanID);
    });

    it('adds .is-active to correct indentGuide', () => {
      const propsWithHover = {
        ...props,
        hoverIndentGuideIds: new Set([parentSpanID]),
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithHover} />);
      const activeIndentGuide = container.querySelectorAll('.is-active');
      expect(activeIndentGuide.length).toBe(1);
      expect(activeIndentGuide[0].getAttribute('data-ancestor-id')).toBe(parentSpanID);
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
      fireEvent.mouseEnter(indentGuide, {});
      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.addHoverIndentGuideId on mouse enter if mouse came from a indentGuide with the same ancestorId', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const event = new MouseEvent('mouseenter', {
        bubbles: true,
        relatedTarget,
      });
      fireEvent(indentGuide, event);

      expect(props.addHoverIndentGuideId).not.toHaveBeenCalled();
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
      fireEvent.mouseLeave(indentGuide, {});
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('does not call props.removeHoverIndentGuideId on mouse leave if mouse leaves to a indentGuide with the same ancestorId', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const event = new MouseEvent('mouseleave', {
        bubbles: true,
        relatedTarget,
      });
      fireEvent(indentGuide, event);

      expect(props.removeHoverIndentGuideId).not.toHaveBeenCalled();
    });
  });

  describe('icon', () => {
    let renderResult;

    beforeEach(() => {
      const updatedProps = { ...props, span: { ...props.span, hasChildren: true } };
      renderResult = render(<UnconnectedSpanTreeOffset {...updatedProps} />);
    });

    it('does not render icon if props.otelSpan.hasChildren is false', () => {
      const propsWithoutChildren = { ...props, span: { ...props.span, hasChildren: false } };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithoutChildren} />);
      expect(container.querySelector('svg')).toBeNull();
    });

    it('does not render icon if props.otelSpan.hasChildren is true and showChildrenIcon is false', () => {
      const propsWithIconDisabled = {
        ...props,
        span: { ...props.span, hasChildren: true },
        showChildrenIcon: false,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithIconDisabled} />);
      expect(container.querySelector('svg')).toBeNull();
    });

    it('renders IoChevronRight if props.otelSpan.hasChildren is true and props.childrenVisible is false', () => {
      const { container } = renderResult;
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('renders IoIosArrowDown if props.otelSpan.hasChildren is true and props.childrenVisible is true', () => {
      const propsWithVisibleChildren = {
        ...props,
        span: { ...props.span, hasChildren: true },
        childrenVisible: true,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithVisibleChildren} />);
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      const { container } = renderResult;
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      fireEvent.mouseEnter(iconWrapper, {});
      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      const { container } = renderResult;
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      fireEvent.mouseLeave(iconWrapper, {});
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });
  });

  describe('mapDispatchToProps()', () => {
    it('creates the actions correctly', () => {
      expect(mapDispatchToProps(() => {})).toEqual({
        addHoverIndentGuideId: expect.any(Function),
        removeHoverIndentGuideId: expect.any(Function),
      });
    });
  });

  describe('mapStateToProps()', () => {
    it('maps state to props correctly', () => {
      const hoverIndentGuideIds = new Set([parentSpanID]);
      const state = {
        traceTimeline: {
          hoverIndentGuideIds,
        },
      };
      const mappedProps = mapStateToProps(state);
      expect(mappedProps).toEqual({
        hoverIndentGuideIds,
      });
      expect(mappedProps.hoverIndentGuideIds).toBe(hoverIndentGuideIds);
    });
  });
});
