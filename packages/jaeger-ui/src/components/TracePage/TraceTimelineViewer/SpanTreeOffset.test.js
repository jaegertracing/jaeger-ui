// Copyright (c) 2018 Uber Technologies, Inc.
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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { mapDispatchToProps, mapStateToProps, UnconnectedSpanTreeOffset } from './SpanTreeOffset';
import spanAncestorIdsSpy from '../../../utils/span-ancestor-ids';

jest.mock('../../../utils/span-ancestor-ids');

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  const specialRootID = 'root';
  let props;

  beforeEach(() => {
    spanAncestorIdsSpy.mockImplementation(() => [parentSpanID, rootSpanID]);
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

  describe('indent guides rendering and interaction', () => {
    it('renders only root-level indent guide when there are no ancestors', () => {
      spanAncestorIdsSpy.mockReturnValue([]);
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = screen.getAllByTestId(/indent-guide/);

      expect(indentGuides).toHaveLength(1);
      expect(indentGuides[0]).toHaveAttribute('data-ancestor-id', specialRootID);
    });

    it('renders one indent guide per ancestor plus the root guide', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = screen.getAllByTestId(/indent-guide/);

      expect(indentGuides).toHaveLength(3);
      expect(indentGuides[0]).toHaveAttribute('data-ancestor-id', specialRootID);
      expect(indentGuides[1]).toHaveAttribute('data-ancestor-id', rootSpanID);
      expect(indentGuides[2]).toHaveAttribute('data-ancestor-id', parentSpanID);
    });

    it('applies "is-active" class to hovered ancestor ID', () => {
      const propsWithHover = {
        ...props,
        hoverIndentGuideIds: new Set([parentSpanID]),
      };
      render(<UnconnectedSpanTreeOffset {...propsWithHover} />);
      const activeGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);

      expect(activeGuide).toHaveClass('is-active');
    });

    it('calls addHoverIndentGuideId on mouse enter from non-similar target', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);
      fireEvent.mouseEnter(indentGuide);

      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('skips addHoverIndentGuideId if mouse enters from same ancestor ID', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);

      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const event = new MouseEvent('mouseenter', { bubbles: true, relatedTarget });
      fireEvent(indentGuide, event);

      expect(props.addHoverIndentGuideId).not.toHaveBeenCalled();
    });

    it('calls removeHoverIndentGuideId on mouse leave to a non-similar target', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);
      fireEvent.mouseLeave(indentGuide);

      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(parentSpanID);
    });

    it('skips removeHoverIndentGuideId if mouse leaves to same ancestor ID', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuide = screen.getByTestId(`indent-guide-${parentSpanID}`);

      const relatedTarget = document.createElement('span');
      relatedTarget.dataset.ancestorId = parentSpanID;

      const event = new MouseEvent('mouseleave', { bubbles: true, relatedTarget });
      fireEvent(indentGuide, event);

      expect(props.removeHoverIndentGuideId).not.toHaveBeenCalled();
    });
  });

  describe('collapse/expand icon rendering', () => {
    beforeEach(() => {
      props.span = { ...props.span, hasChildren: true };
    });

    it('does not render icon when span has no children', () => {
      props.span.hasChildren = false;
      render(<UnconnectedSpanTreeOffset {...props} />);

      expect(screen.queryByTestId('icon-wrapper')).not.toBeInTheDocument();
    });

    it('does not render icon when showChildrenIcon is false', () => {
      props.showChildrenIcon = false;
      render(<UnconnectedSpanTreeOffset {...props} />);

      expect(screen.queryByTestId('icon-wrapper')).not.toBeInTheDocument();
    });

    it('renders collapsed icon when childrenVisible is false', () => {
      props.childrenVisible = false;
      render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = screen.getByTestId('icon-wrapper');

      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper.querySelector('svg')).toBeInTheDocument();
    });

    it('renders expanded icon when childrenVisible is true', () => {
      props.childrenVisible = true;
      render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = screen.getByTestId('icon-wrapper');

      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper.querySelector('svg')).toBeInTheDocument();
    });

    it('triggers addHoverIndentGuideId on icon hover in', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = screen.getByTestId('icon-wrapper');
      fireEvent.mouseEnter(iconWrapper);

      expect(props.addHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });

    it('triggers removeHoverIndentGuideId on icon hover out', () => {
      render(<UnconnectedSpanTreeOffset {...props} />);
      const iconWrapper = screen.getByTestId('icon-wrapper');
      fireEvent.mouseLeave(iconWrapper);

      expect(props.removeHoverIndentGuideId).toHaveBeenCalledWith(ownSpanID);
    });
  });

  describe('Redux connection', () => {
    it('mapDispatchToProps returns required actions', () => {
      const dispatch = jest.fn();
      const result = mapDispatchToProps(dispatch);

      expect(result).toHaveProperty('addHoverIndentGuideId');
      expect(result).toHaveProperty('removeHoverIndentGuideId');
    });

    it('mapStateToProps correctly maps hoverIndentGuideIds', () => {
      const hoverIndentGuideIds = new Set(['foo']);
      const state = { traceTimeline: { hoverIndentGuideIds } };
      const result = mapStateToProps(state);

      expect(result.hoverIndentGuideIds).toBe(hoverIndentGuideIds);
    });
  });
});
