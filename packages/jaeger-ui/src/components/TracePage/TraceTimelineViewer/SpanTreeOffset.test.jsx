// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  let props;

  beforeEach(() => {
    props = {
      addHoverIndentGuideId: jest.fn(),
      hoverIndentGuideIds: new Set(),
      removeHoverIndentGuideId: jest.fn(),
      color: '#000000',
      spanID: ownSpanID,
      hasChildren: false,
      childCount: 0,
      ancestorEntries: [
        { ancestorId: rootSpanID, color: '#root-color' },
        { ancestorId: parentSpanID, color: '#parent-color' },
      ],
      isLastChild: true,
    };
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders no .SpanTreeOffset--indentGuide if span has no ancestors', () => {
      const propsWithRootSpan = {
        ...props,
        spanID: rootSpanID,
        ancestorEntries: [],
        isLastChild: false,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithRootSpan} />);
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
      it('adds is-last to immediate parent guide when span is last child and isDetailRow is false', () => {
        // isLastChild is true in default props
        const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide).toHaveClass('is-last');
        expect(parentGuide).not.toHaveClass('is-terminated');
      });

      it('adds is-terminated (not is-last) to immediate parent guide when span is last child and isDetailRow is true', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} isDetailRow />);
        const parentGuide = container.querySelector(`[data-ancestor-id="${parentSpanID}"]`);
        expect(parentGuide).not.toHaveClass('is-last');
        expect(parentGuide).toHaveClass('is-terminated');
      });

      it('does not add is-last or is-terminated to immediate parent guide when span is not the last child', () => {
        const propsNotLast = { ...props, isLastChild: false };
        const { container } = render(<UnconnectedSpanTreeOffset {...propsNotLast} />);
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
        const propsWithChildren = {
          ...props,
          hasChildren: true,
          childCount: 1,
        };
        const { getByTestId } = render(
          <UnconnectedSpanTreeOffset {...propsWithChildren} isDetailRow showChildrenIcon={false} />
        );
        expect(getByTestId('detail-row-self-guide')).toBeInTheDocument();
        expect(getByTestId('detail-row-self-guide')).toHaveClass('SpanTreeOffset--indentGuide');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-last');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-terminated');
      });

      it('does not render a self-guide when isDetailRow is false', () => {
        const propsWithChildren = {
          ...props,
          hasChildren: true,
          childCount: 1,
        };
        const { queryByTestId } = render(
          <UnconnectedSpanTreeOffset {...propsWithChildren} showChildrenIcon={false} />
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

    describe('terminated ancestors', () => {
      it('applies is-terminated to non-immediate ancestors with null color', () => {
        const propsTerminated = {
          ...props,
          ancestorEntries: [
            { ancestorId: rootSpanID, color: null },
            { ancestorId: parentSpanID, color: '#parent-color' },
          ],
        };
        const { container } = render(<UnconnectedSpanTreeOffset {...propsTerminated} />);
        const rootGuide = container.querySelector(`[data-ancestor-id="${rootSpanID}"]`);
        expect(rootGuide).toHaveClass('is-terminated');
      });

      it('does not apply is-terminated to non-immediate ancestors with non-null color', () => {
        const { container } = render(<UnconnectedSpanTreeOffset {...props} />);
        const rootGuide = container.querySelector(`[data-ancestor-id="${rootSpanID}"]`);
        expect(rootGuide).not.toHaveClass('is-terminated');
      });
    });
  });

  describe('icon', () => {
    let renderResult;
    let propsWithChildren;

    beforeEach(() => {
      propsWithChildren = { ...props, hasChildren: true, childCount: 1 };
      renderResult = render(<UnconnectedSpanTreeOffset {...propsWithChildren} />);
    });

    it('renders icon wrapper with dot if hasChildren is false', () => {
      const propsWithoutChildren = { ...props, hasChildren: false, childCount: 0 };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithoutChildren} />);
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(container.querySelector('.SpanTreeOffset--dot')).not.toBeNull();
    });

    it('does not render icon wrapper if hasChildren is true and showChildrenIcon is false', () => {
      const propsWithIconDisabled = {
        ...propsWithChildren,
        showChildrenIcon: false,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithIconDisabled} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).toBeNull();
    });

    it('renders icon wrapper with child count if hasChildren is true and childrenVisible is false', () => {
      const { container } = renderResult;
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(iconWrapper.textContent).toBe('1'); // One child
    });

    it('renders icon wrapper if hasChildren is true and childrenVisible is true', () => {
      const propsWithVisibleChildren = {
        ...propsWithChildren,
        childrenVisible: true,
      };
      const { container } = render(<UnconnectedSpanTreeOffset {...propsWithVisibleChildren} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).not.toBeNull();
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
