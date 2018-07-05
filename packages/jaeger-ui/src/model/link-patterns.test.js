// Copyright (c) 2017 The Jaeger Authors.
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

import { processTemplate } from './link-patterns';

describe('processTemplate()', () => {
  it('correctly replaces variables', () => {
    const processedTemplate = processTemplate(
      // eslint-disable-next-line no-template-curly-in-string
      'this is a test with ${oneVariable}${anotherVariable} and the same ${oneVariable}',
      a => a
    );
    expect(processedTemplate.parameters).toEqual(['oneVariable', 'anotherVariable']);
    expect(processedTemplate.template('MYFIRSTVAR', 'SECOND')).toBe(
      'this is a test with MYFIRSTVARSECOND and the same MYFIRSTVAR'
    );
  });

  it('correctly uses the encoding function', () => {
    const processedTemplate = processTemplate(
      // eslint-disable-next-line no-template-curly-in-string
      'this is a test with ${oneVariable}${anotherVariable} and the same ${oneVariable}',
      e => `/${e}\\`
    );
    expect(processedTemplate.parameters).toEqual(['oneVariable', 'anotherVariable']);
    expect(processedTemplate.template('MYFIRSTVAR', 'SECOND')).toBe(
      'this is a test with /MYFIRSTVAR\\/SECOND\\ and the same /MYFIRSTVAR\\'
    );
  });

  it('correctly returns the same object when passing an already processed template', () => {
    const alreadyProcessed = {
      parameters: ['b'],
      template: b => `a${b}c`,
    };
    const processedTemplate = processTemplate(alreadyProcessed, a => a);
    expect(processedTemplate).toBe(alreadyProcessed);
  });

  it('reports an error when passing an object that does not look like an already processed template', () => {
    expect(() =>
      processTemplate(
        {
          template: b => `a${b}c`,
        },
        a => a
      )
    ).toThrow();
    expect(() =>
      processTemplate(
        {
          parameters: ['b'],
        },
        a => a
      )
    ).toThrow();
    expect(() => processTemplate({}, a => a)).toThrow();
  });
});

// TODO:
/*
describe('createTestFunction()', () => {});

describe('processLinkPattern()', () => {});

describe('getParameterInArray()', () => {});

describe('getParameterInAncestor()', () => {});

describe('callTemplate()', () => {});

describe('computeLinks()', () => {});
*/
