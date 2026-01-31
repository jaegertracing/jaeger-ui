// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as config from './get-config';
import processScripts from './process-scripts';

describe('processScripts', () => {
  const getConfigValueSpy = jest.spyOn(config, 'getConfigValue');
  const createTextNodeSpy = jest.spyOn(document, 'createTextNode');
  const createElementSpy = jest.spyOn(document, 'createElement');
  const appendScriptSpy = jest.spyOn(document.body, 'appendChild');
  const appendTextSpy = jest.fn();
  const mockValue = (text, number) => `${text} --- ${number}`;
  const texts = ['text 0', 'text 1'];
  const configScripts = texts.map(text => ({ text, type: 'inline' }));
  let scriptElems;

  beforeAll(() => {
    createTextNodeSpy.mockImplementation(text => mockValue(text, createTextNodeSpy.mock.calls.length));
    createElementSpy.mockImplementation(text => {
      const script = {
        append: appendTextSpy,
        identifier: mockValue(text, createElementSpy.mock.calls.length),
      };
      scriptElems.push(script);
      return script;
    });
    appendScriptSpy.mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    scriptElems = [];
  });

  it('adds inline scripts', () => {
    getConfigValueSpy.mockReturnValue(configScripts);

    processScripts();
    texts.forEach((text, i) => {
      expect(createTextNodeSpy).toHaveBeenCalledWith(text);
      expect(appendTextSpy).toHaveBeenCalledWith(mockValue(text, 1 + i));
      expect(appendScriptSpy).toHaveBeenCalledWith(scriptElems[i]);
    });
    expect(createElementSpy).toHaveBeenCalledWith('script');
    expect(createElementSpy).toHaveBeenCalledTimes(texts.length);
  });

  it('ignores other script types', () => {
    getConfigValueSpy.mockReturnValue([...configScripts, { type: 'not-inline' }]);

    processScripts();
    expect(createElementSpy).toHaveBeenCalledTimes(texts.length);
  });

  it('handles no scripts', () => {
    getConfigValueSpy.mockReturnValue(undefined);
    expect(processScripts).not.toThrow();
  });
});
