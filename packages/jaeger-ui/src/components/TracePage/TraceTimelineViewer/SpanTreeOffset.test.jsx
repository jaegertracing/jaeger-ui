// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

vi.mock('../../../utils/span-ancestor-ids');

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  let props;

  beforeEach(() => {
    props = {
      addHoverIndentGuideId: vi.fn(),
      hoverIndentGuideIds: new Set(),
      removeHoverIndentGuideId: vi.fn(),
      color: '#000000',
      spanID: ownSpanID,
      hasChildren: false,
      childCount: 0,
      isLastChild: true,
      parentColor: '#111111',
      ancestors: [
        { spanID: rootSpanID, color: '#ff0000', isTerminated: false },
        { spanID: parentSpanID, color: '#00ff00', isTerminated: false },
      ],
    };
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders no .SpanTreeOffset--indentGuide if array is empty', () => {
      const propsWithNoAncestors = { ...props, ancestors: [] };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithNoAncestors} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(0);
    });

    it('renders one .SpanTreeOffset--indentGuide per ancestor span', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(2); // rootSpan and parentSpan
      expect(indentGuides[0].getAttribute('data-ancestor-id')).toBe(rootSpanID);
      expect(indentGuides[1].getAttribute('data-ancestor-id')).toBe(parentSpanID);
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

    describe('is-last class (last-child span)', () => {
      it('adds is-last to immediate parent guide when isLastChild is true and isDetailRow is false', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} isLastChild />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide).toHaveClass('is-last');
        expect(parentGuide).not.toHaveClass('is-terminated');
      });

      it('adds is-terminated (not is-last) to immediate parent guide when isLastChild is true and isDetailRow is true', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} isLastChild isDetailRow />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide).not.toHaveClass('is-last');
        expect(parentGuide).toHaveClass('is-terminated');
      });

      it('does not add is-last or is-terminated to immediate parent guide when not the last child', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} isLastChild={false} />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide).not.toHaveClass('is-last');
        expect(parentGuide).not.toHaveClass('is-terminated');
      });
    });

    describe('horizontal line', () => {
      it('renders the horizontal line for the immediate parent when isDetailRow is false', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide.querySelector('.SpanTreeOffset--horizontalLine')).not.toBeNull();
      });

      it('does not render the horizontal line for the immediate parent when isDetailRow is true', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} isDetailRow />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide.querySelector('.SpanTreeOffset--horizontalLine')).toBeNull();
      });

      it('does not render the horizontal line for non-immediate ancestors', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
        const rootGuide = container.querySelector(`[data-ancestor-id="${rootSpanID}"]`);
        expect(rootGuide.querySelector('.SpanTreeOffset--horizontalLine')).toBeNull();
      });
    });

    describe('self-guide in detail row (parent span)', () => {
      it('renders a self-guide when isDetailRow is true and span has children', () => {
        const { getByTestId } = render(
          <UnconnectedSpanTreeOffset
            {...props}
            hasChildren
            childCount={1}
            isDetailRow
            showChildrenIcon={false}
          />
        );
        expect(getByTestId('detail-row-self-guide')).toBeInTheDocument();
        expect(getByTestId('detail-row-self-guide')).toHaveClass('SpanTreeOffset--indentGuide');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-last');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-terminated');
      });

      it('does not render a self-guide when isDetailRow is false', () => {
        const { queryByTestId } = render(
          <UnconnectedSpanTreeOffset {...props} hasChildren childCount={1} showChildrenIcon={false} />
        );
        expect(queryByTestId('detail-row-self-guide')).toBeNull();
      });

      it('does not render a self-guide when span has no children', () => {
        const { queryByTestId } = render(
          <UnconnectedSpanTreeOffset {...props} isDetailRow showChildrenIcon={false} />
        );
        expect(queryByTestId('detail-row-self-guide')).toBeNull();
      });
    });
  });

  describe('icon', () => {
    it('renders icon wrapper with dot if hasChildren is false', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(container.querySelector('.SpanTreeOffset--dot')).not.toBeNull();
    });

    it('does not render icon wrapper if hasChildren is true and showChildrenIcon is false', () => {
      const propsWithIconDisabled = {
        ...props,
        hasChildren: true,
        childCount: 1,
        showChildrenIcon: false,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithIconDisabled} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).toBeNull();
    });

    it('renders icon wrapper with child count if hasChildren is true and childrenVisible is false', () => {
      const { container } = render(
        <UnconnectedSpanTreeOffset {...props} hasChildren childCount={1} childrenVisible={false} />
      );
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(iconWrapper.textContent).toBe('1'); // One child
    });

    it('renders icon wrapper if hasChildren is true and childrenVisible is true', () => {
      const propsWithVisibleChildren = {
        ...props,
        hasChildren: true,
        childCount: 1,
        childrenVisible: true,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithVisibleChildren} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).not.toBeNull();
    });

    it('calls props.addHoverIndentGuideId on mouse enter', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      fireEvent.mouseEnter(iconWrapper, {});
      expect(props.addHoverIndentGuideId).toHaveBeenCalledTimes(1);
      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });

    it('calls props.removeHoverIndentGuideId on mouse leave', () => {
      const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
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
