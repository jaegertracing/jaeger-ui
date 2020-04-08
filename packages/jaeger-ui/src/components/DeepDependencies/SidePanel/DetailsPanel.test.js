// Copyright (c) 2020 Uber Technologies, Inc.
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

/* eslint-disable import/first */
import React from 'react';
import { shallow } from 'enzyme';
import _get from 'lodash/get';
import _set from 'lodash/set';

import stringSupplant from '../../../utils/stringSupplant';
import JaegerAPI from '../../../api/jaeger';
import { UnconnectedDetailsPanel as DetailsPanel } from './DetailsPanel';

describe('<SidePanel>', () => {
  describe('componentDidMount', () => {
    it('fetches details', () => {
    });
  });

  describe('componentDidUpdate', () => {
    it('fetches details and clears relevant state if decorationID changes', () => {
    });

    it('fetches details and clears relevant state if operation changes', () => {
    });

    it('fetches details and clears relevant state if service changes', () => {
    });

    it('does nothing if decorationID, operation, and service are unchanged', () => {
    });
  });

  describe('fetchDetails', () => {
    const service = 'test svc';
    // const operation = 'test op';
    // const operationArray = ['test op0', 'test op1'];
    let fetchDecorationSpy;
    let promise;
    let res;
    let rej;
    // const decorationID = 'test decoration ID';

    beforeAll(() => {
      fetchDecorationSpy = jest.spyOn(JaegerAPI, 'fetchDecoration').mockImplementation(
        () => {
          promise = new Promise((resolve, reject) => {
            res = resolve;
            rej = reject;
          });
          return promise;
        }
      );
    });

    beforeEach(() => {
      fetchDecorationSpy.mockClear();
      // resolves = [];
      // rejects = [];
    });

    describe('fetches correct details url, perferring op-scoped details, or does not fetch at all', () => {
      const details = 'test details';
      const columnDefs = ['test', 'column', 'defs'];

      // TODO: one `it` if all pass, separate `it`s if any fail
      ['detailUrl#{service}', undefined].forEach(detailUrl => {
        ['detail.path.#{service}', undefined].forEach(detailPath => {
          ['detail.column.def.path.#{service}', undefined].forEach(detailColumnDefPath => {
            ['opDetailUrl#{service}#{operation}', undefined].forEach(opDetailUrl => {
              ['op.detail.path.#{service}.#{operation}', undefined].forEach(opDetailPath => {
                ['op.detail.column.def.path.#{service}', undefined].forEach(opDetailColumnDefPath => {
                  ['op', ['op0', 'op1'], undefined].forEach(operation => {
                    [{ message: 'Err obj with message' }, 'error message' , false].forEach(error => {
                      [true, false].forEach(hasDetails => {
                        [true, false].forEach(hasColumnDefPath => {

                          it(
                            'fetchs details for an operation iff operation, opDetailUrl, and opDetailPath are all strings',
                            async () => {
                              const detailsPanel = new DetailsPanel({
                                operation,
                                service,
                                decorationSchema: {
                                  detailUrl,
                                  detailPath,
                                  detailColumnDefPath,
                                  opDetailUrl,
                                  opDetailPath,
                                  opDetailColumnDefPath,
                                },
                              });
                              const setStateSpy = jest.spyOn(detailsPanel, 'setState');
                              detailsPanel.fetchDetails();

                              let supplantedUrl;
                              let supplantedColumnDefPath;
                              let supplantedDetailsPath;

                              if (typeof opDetailUrl === 'string' && typeof opDetailPath === 'string' && typeof operation === 'string') {
                                supplantedUrl = stringSupplant(opDetailUrl, { service, operation });
                                supplantedDetailsPath = stringSupplant(opDetailPath, { service, operation });
                                if (opDetailColumnDefPath) supplantedColumnDefPath = stringSupplant(opDetailColumnDefPath, { service, operation });
                              } else if (typeof detailUrl === 'string' && typeof detailPath === 'string') {
                                supplantedUrl = stringSupplant(detailUrl, { service });
                                supplantedDetailsPath = stringSupplant(detailPath, { service });
                                if (detailColumnDefPath) supplantedColumnDefPath = stringSupplant(detailColumnDefPath, { service });
                              } else {
                                expect(fetchDecorationSpy).not.toHaveBeenCalled();
                                return;
                              }

                              expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedUrl);
                              expect(setStateSpy).toHaveBeenLastCalledWith({ detailsLoading: true });

                              const expectedSetStateArg = {
                                detailsLoading: false,
                                detailsErred: Boolean(error || !hasDetails),
                              };

                              if (!error) {
                                const result = {};

                                if (hasDetails) {
                                  _set(result, supplantedDetailsPath, details);
                                  expectedSetStateArg.details = details;
                                } else {
                                  expectedSetStateArg.details = `\`${supplantedDetailsPath}\` not found in response`;
                                }

                                if (hasColumnDefPath && supplantedColumnDefPath) {
                                  _set(result, supplantedColumnDefPath, columnDefs);
                                  expectedSetStateArg.columnDefs = columnDefs;
                                } else {
                                  expectedSetStateArg.columnDefs = [];
                                }

                                res(result);
                                await promise;
                                expect(setStateSpy).toHaveBeenLastCalledWith(expectedSetStateArg);

                              } else {
                                const errorMessage = error.message || error;
                                expectedSetStateArg.details = `Unable to fetch decoration: ${errorMessage}`;
                                rej(error);
                                await promise.catch(() => {});
                                expect(setStateSpy).toHaveBeenLastCalledWith(expectedSetStateArg);
                              }
                            }
                          );
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });


    it(
      'fetchs details for a service iff service, detailsUrl, and detailsPath are all strings and any of operation, opDetailsUrl, and opDetailsPath are not strings',
      () => {
      }
    );
  });

  describe('render', () => {
  });

  describe('onResize', () => {
  });
});
