// Copyright (c) 2017 Uber Technologies, Inc.
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

import { shallow } from 'enzyme';
import React from 'react';
import IoChevronRight from 'react-icons/lib/io/chevron-right';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';

import { UnconnectedSpanTreeOffset } from './SpanTreeOffset';

describe('SpanTreeOffset', () => {
  const ownSpanID = 'ownSpanID';
  const parentSpanID = 'parentSpanID';
  const rootSpanID = 'rootSpanID';
  const spanWithTwoAncestors = {
    spanID: ownSpanID,
    references: [
      {
        refType: 'CHILD_OF',
        span: {
          spanID: parentSpanID,
          references: [
            {
              refType: 'CHILD_OF',
              span: {
                spanID: rootSpanID,
              },
            },
          ],
        },
      },
    ],
  };
  const specialRootId = 'root';
  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      addSpanId: jest.fn(),
      hoverSpanIds: new Set(),
      removeSpanId: jest.fn(),
      span: spanWithTwoAncestors,
    };
    wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
  });

  describe('.SpanTreeOffset--indentGuide', () => {
    it('should only render one .SpanTreeOffset--indentGuide for entire trace if span has no ancestors', () => {
      props.span = {
        spanID: 'parentlessSpanID',
        references: [
          {
            refType: 'NOT_CHILD_OF',
            span: {
              spanID: 'notAParentSpanID',
              references: [],
            },
          },
        ],
      };
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
      const indentGuides = wrapper.find('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(1);
      expect(indentGuides.prop('data--ancestor-id')).toBe('root');
    });

    it('should render one .SpanTreeOffset--indentGuide per ancestor span, plus one for entire trace', () => {
      const indentGuides = wrapper.find('.SpanTreeOffset--indentGuide');
      expect(indentGuides.length).toBe(3);
      expect(indentGuides.at(0).prop('data--ancestor-id')).toBe(specialRootId);
      expect(indentGuides.at(1).prop('data--ancestor-id')).toBe(rootSpanID);
      expect(indentGuides.at(2).prop('data--ancestor-id')).toBe(parentSpanID);
    });

    it('should add .activeMouseover className to correct indentGuide', () => {
      props.hoverSpanIds = new Set(['parentSpanID']);
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
      const activeMouseoverIndentGuide = wrapper.find('.activeMouseover');
      expect(activeMouseoverIndentGuide.length).toBe(1);
      expect(activeMouseoverIndentGuide.prop('data--ancestor-id')).toBe(parentSpanID);
    });

    it('should call props.addSpanId on mouse enter', () => {
      wrapper.find({ 'data--ancestor-id': 'parentSpanID' }).simulate('mouseenter', {});
      expect(props.addSpanId).toHaveBeenCalledTimes(1);
      expect(props.addSpanId).toHaveBeenCalledWith(parentSpanID);
    });

    it('should not call props.addSpanId on mouse enter if mouse came from a indentGuide with the same ancestorId', () => {
      wrapper.find({ 'data--ancestor-id': 'parentSpanID' }).simulate('mouseenter', {
        relatedTarget: {
          getAttribute: () => 'parentSpanID',
        },
      });
      expect(props.addSpanId).not.toHaveBeenCalled();
    });

    it('should call props.removeSpanId on mouse leave', () => {
      wrapper.find({ 'data--ancestor-id': 'parentSpanID' }).simulate('mouseleave', {});
      expect(props.removeSpanId).toHaveBeenCalledTimes(1);
      expect(props.removeSpanId).toHaveBeenCalledWith(parentSpanID);
    });

    it('should not call props.removeSpanId on mouse out if mouse leaves to a indentGuide with the same ancestorId', () => {
      wrapper.find({ 'data--ancestor-id': 'parentSpanID' }).simulate('mouseleave', {
        relatedTarget: {
          getAttribute: () => 'parentSpanID',
        },
      });
      expect(props.removeSpanId).not.toHaveBeenCalled();
    });
  });

  describe('icon', () => {
    beforeEach(() => {
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} hasChildren />);
    });

    it('should not render icon if props.hasChildren is false', () => {
      wrapper = shallow(<UnconnectedSpanTreeOffset {...props} />);
      expect(wrapper.find(IoChevronRight).length).toBe(0);
      expect(wrapper.find(IoIosArrowDown).length).toBe(0);
    });

    it('should render IoChevronRight if props.hasChildren is true and props.childrenVisible is false', () => {
      expect(wrapper.find(IoChevronRight).length).toBe(1);
      expect(wrapper.find(IoIosArrowDown).length).toBe(0);
    });

    it('should render IoIosArrowDown if props.hasChildren is true and props.childrenVisible is true', () => {
      wrapper.setProps({ childrenVisible: true });
      expect(wrapper.find(IoChevronRight).length).toBe(0);
      expect(wrapper.find(IoIosArrowDown).length).toBe(1);
    });

    it('should call props.addSpanId on mouse enter', () => {
      wrapper.find('.SpanTreeOffset--iconWrapper').simulate('mouseenter', {});
      expect(props.addSpanId).toHaveBeenCalledTimes(1);
      expect(props.addSpanId).toHaveBeenCalledWith(ownSpanID);
    });

    it('should call props.removeSpanId on mouse leave', () => {
      wrapper.find('.SpanTreeOffset--iconWrapper').simulate('mouseleave', {});
      expect(props.removeSpanId).toHaveBeenCalledTimes(1);
      expect(props.removeSpanId).toHaveBeenCalledWith(ownSpanID);
    });
  });
});
