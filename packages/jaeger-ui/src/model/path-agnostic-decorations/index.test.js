// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import getDecorationPresentation from '.';

describe('getDecorationPresentation', () => {
  const decorationID = 'test decoration id';
  const service = 'test service';
  const operation = 'test operation';
  const decorationValue = 42;
  const decorationMax = 108;
  const props = { decorationID, service, operation, decorationValue, decorationMax };

  it('returns an empty object without a decoration ID', () => {
    expect(getDecorationPresentation({ ...props, decorationID: undefined })).toEqual({});
  });

  it('renders a numeric value and its progress bar', () => {
    const result = getDecorationPresentation(props);
    expect(result).toEqual(expect.objectContaining({ decorationID, decorationValue }));
    expect(React.isValidElement(result.decorationProgressbar)).toBe(true);
    expect(result.decorationProgressbar.props).toEqual({
      backgroundHue: 120,
      decorationHue: 0,
      maxValue: decorationMax,
      strokeWidth: 10,
      text: '42',
      value: decorationValue,
    });
    expect(result.decorationProgressbar.key).toBe(service + '\t' + operation);
  });

  it('returns service decoration', () => {
    const result = getDecorationPresentation({ ...props, operation: undefined });
    expect(result.decorationValue).toBe(decorationValue);
    expect(result.decorationProgressbar.props.maxValue).toBe(decorationMax);
    expect(result.decorationProgressbar.key).toBe(service + '\tundefined');
  });

  it('omits CircularProgressbar if value is a string', () => {
    const value = 'Unable to fetch decoration: offline';
    expect(getDecorationPresentation({ ...props, decorationValue: value })).toEqual({
      decorationID,
      decorationValue: value,
      decorationProgressbar: undefined,
    });
  });

  it('does not render a progress bar while the value is pending', () => {
    const result = getDecorationPresentation({ ...props, decorationValue: undefined });
    expect(result.decorationProgressbar).toBeUndefined();
    expect(result.decorationID).toBe(decorationID);
  });

  it('uses the numeric value as the scale when no maximum is supplied', () => {
    const result = getDecorationPresentation({ ...props, decorationMax: undefined });
    expect(result.decorationProgressbar.props.maxValue).toBe(decorationValue);
  });
});
