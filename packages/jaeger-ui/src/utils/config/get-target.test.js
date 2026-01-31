// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import * as getConfig from './get-config';
import { getTargetBlankOrTop, getTargetEmptyOrBlank } from './get-target';

let getConfigValueSpy;

beforeAll(() => {
  getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
});

describe('getTarget', () => {
  it('getTargetEmptyOrBlank returns empty because forbidNewPage is true', () => {
    getConfigValueSpy.mockReturnValue(true);
    const target = getTargetEmptyOrBlank();
    expect(target).toBe('');
  });
  it('getTargetEmptyOrBlank returns _blank because forbidNewPage is true', () => {
    getConfigValueSpy.mockReturnValue(false);
    const target = getTargetEmptyOrBlank();
    expect(target).toBe('_blank');
  });
  it('getTargetBlankOrTop returns _top because forbidNewPage is true', () => {
    getConfigValueSpy.mockReturnValue(true);
    const target = getTargetBlankOrTop();
    expect(target).toBe('_top');
  });
  it('getTargetBlankOrTop returns _blank because forbidNewPage is true', () => {
    getConfigValueSpy.mockReturnValue(false);
    const target = getTargetBlankOrTop();
    expect(target).toBe('_blank');
  });
});
