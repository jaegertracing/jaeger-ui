// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import * as getConfigModule from './get-config';
import { getTargetBlankOrTop, getTargetEmptyOrBlank } from './get-target';

let getConfigSpy;

beforeAll(() => {
  getConfigSpy = jest.spyOn(getConfigModule, 'default');
});

describe('getTarget', () => {
  it('getTargetEmptyOrBlank returns empty because forbidNewPage is true', () => {
    getConfigSpy.mockReturnValue({ forbidNewPage: true });
    const target = getTargetEmptyOrBlank();
    expect(target).toBe('');
  });
  it('getTargetEmptyOrBlank returns _blank because forbidNewPage is true', () => {
    getConfigSpy.mockReturnValue({ forbidNewPage: false });
    const target = getTargetEmptyOrBlank();
    expect(target).toBe('_blank');
  });
  it('getTargetBlankOrTop returns _top because forbidNewPage is true', () => {
    getConfigSpy.mockReturnValue({ forbidNewPage: true });
    const target = getTargetBlankOrTop();
    expect(target).toBe('_top');
  });
  it('getTargetBlankOrTop returns _blank because forbidNewPage is true', () => {
    getConfigSpy.mockReturnValue({ forbidNewPage: false });
    const target = getTargetBlankOrTop();
    expect(target).toBe('_blank');
  });
});
