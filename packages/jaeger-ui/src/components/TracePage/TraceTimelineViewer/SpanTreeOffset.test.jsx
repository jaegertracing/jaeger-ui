// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanTreeOffset, { getAncestorGuides } from './SpanTreeOffset';

// Derives the tree props from a span the same way SpanBarRow and SpanDetailRow do.
const treeProps = span => ({
  hasChildren: span.hasChildren,
  childCount: span.childSpans.length,
  ancestors: getAncestorGuides(span),
});

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  let props;
  let rootSpan;
  let parentSpan;
  let ownSpan;

  beforeEach(() => {
    // Create span chain with parentSpan references
    rootSpan = {
      spanID: rootSpanID,
      hasChildren: true,
      childSpans: [],
      parentSpan: null,
      resource: { serviceName: 'root-service' },
    };
    parentSpan = {
      spanID: parentSpanID,
      hasChildren: true,
      childSpans: [],
      parentSpan: rootSpan,
      resource: { serviceName: 'parent-service' },
    };
    ownSpan = {
      spanID: ownSpanID,
      hasChildren: false,
      childSpans: [],
      parentSpan,
      resource: { serviceName: 'own-service' },
    };
    rootSpan.childSpans = [parentSpan];
    parentSpan.childSpans = [ownSpan];

    props = {
      color: '#000000',
      ...treeProps(ownSpan),
    };
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('renders no .SpanTreeOffset--indentGuide if span has no ancestors', () => {
      const propsWithRootSpan = { ...props, ...treeProps(rootSpan) };
      const { container } = render(<SpanTreeOffset {...propsWithRootSpan} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(0);
    });

    it('renders one .SpanTreeOffset--indentGuide per ancestor span', () => {
      const { container } = render(<SpanTreeOffset {...props} />);
      const indentGuides = container.querySelectorAll('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(2); // rootSpan and parentSpan
      expect(indentGuides[0].getAttribute('data-testid')).toBe(`indent-guide-${rootSpanID}`);
      expect(indentGuides[1].getAttribute('data-testid')).toBe(`indent-guide-${parentSpanID}`);
    });

    describe('is-last class (last-child span)', () => {
      it('adds is-last to immediate parent guide when span is last child and isDetailRow is false', () => {
        // ownSpan is the only (last) child of parentSpan
        const { container } = render(<SpanTreeOffset {...props} />);
        const parentGuide = container.querySelector(`[data-testid="indent-guide-${parentSpanID}"]`);
        expect(parentGuide).toHaveClass('is-last');
        expect(parentGuide).not.toHaveClass('is-terminated');
      });

      it('adds is-terminated (not is-last) to immediate parent guide when span is last child and isDetailRow is true', () => {
        // ownSpan is the only (last) child of parentSpan
        const { container } = render(<SpanTreeOffset {...props} isDetailRow />);
        const parentGuide = container.querySelector(`[data-testid="indent-guide-${parentSpanID}"]`);
        expect(parentGuide).not.toHaveClass('is-last');
        expect(parentGuide).toHaveClass('is-terminated');
      });

      it('does not add is-last or is-terminated to immediate parent guide when span is not the last child', () => {
        const siblingSpan = {
          spanID: 'siblingSpanID',
          hasChildren: false,
          childSpans: [],
          parentSpan,
          resource: { serviceName: 'sibling-service' },
        };
        // ownSpan is no longer the last child
        parentSpan.childSpans = [ownSpan, siblingSpan];
        const { container } = render(<SpanTreeOffset {...props} {...treeProps(ownSpan)} />);
        const parentGuide = container.querySelector(`[data-testid="indent-guide-${parentSpanID}"]`);
        expect(parentGuide).not.toHaveClass('is-last');
        expect(parentGuide).not.toHaveClass('is-terminated');
        // restore
        parentSpan.childSpans = [ownSpan];
      });
    });

    describe('is-terminated class (non-immediate ancestor)', () => {
      it('adds is-terminated to an ancestor guide when its branch has ended above this row', () => {
        // parentSpan is the only (last) child of rootSpan
        const { container } = render(<SpanTreeOffset {...props} />);
        const rootGuide = container.querySelector(`[data-testid="indent-guide-${rootSpanID}"]`);
        expect(rootGuide).toHaveClass('is-terminated');
        expect(rootGuide).not.toHaveClass('is-last');
      });

      it('does not add is-terminated to an ancestor guide when its branch continues below this row', () => {
        const uncleSpan = {
          spanID: 'uncleSpanID',
          hasChildren: false,
          childSpans: [],
          parentSpan: rootSpan,
          resource: { serviceName: 'uncle-service' },
        };
        rootSpan.childSpans = [parentSpan, uncleSpan];
        const { container } = render(<SpanTreeOffset {...props} {...treeProps(ownSpan)} />);
        const rootGuide = container.querySelector(`[data-testid="indent-guide-${rootSpanID}"]`);
        expect(rootGuide).not.toHaveClass('is-terminated');
      });
    });

    describe('horizontal line', () => {
      it('renders the horizontal line for the immediate parent when isDetailRow is false', () => {
        const { container } = render(<SpanTreeOffset {...props} />);
        const parentGuide = container.querySelector(`[data-testid="indent-guide-${parentSpanID}"]`);
        expect(parentGuide.querySelector('.SpanTreeOffset--horizontalLine')).not.toBeNull();
      });

      it('does not render the horizontal line for the immediate parent when isDetailRow is true', () => {
        const { container } = render(<SpanTreeOffset {...props} isDetailRow />);
        const parentGuide = container.querySelector(`[data-testid="indent-guide-${parentSpanID}"]`);
        expect(parentGuide.querySelector('.SpanTreeOffset--horizontalLine')).toBeNull();
      });

      it('does not render the horizontal line for non-immediate ancestors', () => {
        const { container } = render(<SpanTreeOffset {...props} />);
        const rootGuide = container.querySelector(`[data-testid="indent-guide-${rootSpanID}"]`);
        expect(rootGuide.querySelector('.SpanTreeOffset--horizontalLine')).toBeNull();
      });
    });

    describe('self-guide in detail row (parent span)', () => {
      it('renders a self-guide when isDetailRow is true and span has children', () => {
        const parentWithChildren = {
          ...ownSpan,
          hasChildren: true,
          childSpans: [{ spanID: 'childSpanID' }],
        };
        const { getByTestId } = render(
          <SpanTreeOffset {...props} {...treeProps(parentWithChildren)} isDetailRow showChildrenIcon={false} />
        );
        expect(getByTestId('detail-row-self-guide')).toBeInTheDocument();
        expect(getByTestId('detail-row-self-guide')).toHaveClass('SpanTreeOffset--indentGuide');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-last');
        expect(getByTestId('detail-row-self-guide')).not.toHaveClass('is-terminated');
      });

      it('does not render a self-guide when isDetailRow is false', () => {
        const parentWithChildren = {
          ...ownSpan,
          hasChildren: true,
          childSpans: [{ spanID: 'childSpanID' }],
        };
        const { queryByTestId } = render(
          <SpanTreeOffset {...props} {...treeProps(parentWithChildren)} showChildrenIcon={false} />
        );
        expect(queryByTestId('detail-row-self-guide')).toBeNull();
      });

      it('does not render a self-guide when span has no children', () => {
        const { queryByTestId } = render(
          <SpanTreeOffset {...props} {...treeProps(ownSpan)} isDetailRow showChildrenIcon={false} />
        );
        expect(queryByTestId('detail-row-self-guide')).toBeNull();
      });
    });
  });

  describe('icon', () => {
    let renderResult;
    let spanWithChildren;

    beforeEach(() => {
      spanWithChildren = { ...ownSpan, hasChildren: true, childSpans: [{}] };
      const updatedProps = { ...props, ...treeProps(spanWithChildren) };
      renderResult = render(<SpanTreeOffset {...updatedProps} />);
    });

    it('renders icon wrapper with dot if props.span.hasChildren is false', () => {
      const propsWithoutChildren = { ...props, ...treeProps(ownSpan) };
      const { container } = render(<SpanTreeOffset {...propsWithoutChildren} />);
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(container.querySelector('.SpanTreeOffset--dot')).not.toBeNull();
    });

    it('does not render icon wrapper if props.span.hasChildren is true and showChildrenIcon is false', () => {
      const propsWithIconDisabled = {
        ...props,
        ...treeProps(spanWithChildren),
        showChildrenIcon: false,
      };
      const { container } = render(<SpanTreeOffset {...propsWithIconDisabled} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).toBeNull();
    });

    it('renders icon wrapper with child count if props.span.hasChildren is true and props.childrenVisible is false', () => {
      const { container } = renderResult;
      const iconWrapper = container.querySelector('.SpanTreeOffset--iconWrapper');
      expect(iconWrapper).not.toBeNull();
      expect(iconWrapper.textContent).toBe('1'); // One child
    });

    it('renders icon wrapper if props.span.hasChildren is true and props.childrenVisible is true', () => {
      const propsWithVisibleChildren = {
        ...props,
        ...treeProps(spanWithChildren),
        childrenVisible: true,
      };
      const { container } = render(<SpanTreeOffset {...propsWithVisibleChildren} />);
      expect(container.querySelector('.SpanTreeOffset--iconWrapper')).not.toBeNull();
    });

    it('calls onClick when Enter is pressed on the span wrapper', () => {
      const onClick = jest.fn();
      const { container } = render(<SpanTreeOffset {...props} {...treeProps(spanWithChildren)} onClick={onClick} />);
      const wrapper = container.querySelector('.SpanTreeOffset');
      fireEvent.keyDown(wrapper, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space is pressed on the span wrapper', () => {
      const onClick = jest.fn();
      const { container } = render(<SpanTreeOffset {...props} {...treeProps(spanWithChildren)} onClick={onClick} />);
      const wrapper = container.querySelector('.SpanTreeOffset');
      fireEvent.keyDown(wrapper, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick for other keys on the span wrapper', () => {
      const onClick = jest.fn();
      const { container } = render(<SpanTreeOffset {...props} {...treeProps(spanWithChildren)} onClick={onClick} />);
      const wrapper = container.querySelector('.SpanTreeOffset');
      fireEvent.keyDown(wrapper, { key: 'Tab' });
      expect(onClick).not.toHaveBeenCalled();
    });

    it('sets tabIndex on the span wrapper when onClick is provided', () => {
      const onClick = jest.fn();
      const { container } = render(<SpanTreeOffset {...props} {...treeProps(spanWithChildren)} onClick={onClick} />);
      const wrapper = container.querySelector('.SpanTreeOffset');
      expect(wrapper).toHaveAttribute('tabindex', '0');
    });
  });

  describe('getAncestorGuides()', () => {
    it('returns an empty array for a root span', () => {
      expect(getAncestorGuides(rootSpan)).toEqual([]);
    });

    it('returns one guide per ancestor, ordered from the root to the immediate parent', () => {
      const guides = getAncestorGuides(ownSpan);
      expect(guides.map(guide => guide.spanID)).toEqual([rootSpanID, parentSpanID]);
      expect(guides[0].color).toEqual(expect.any(String));
      expect(guides[0].color).not.toBe(guides[1].color);
    });

    it('marks each guide terminated when the next span down the chain is its last child', () => {
      const siblingSpan = { spanID: 'siblingSpanID', childSpans: [] };
      parentSpan.childSpans = [ownSpan, siblingSpan];
      expect(getAncestorGuides(ownSpan).map(guide => guide.isTerminated)).toEqual([true, false]);
    });
  });
});
