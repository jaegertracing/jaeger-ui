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

import React from 'react';
import { shallow } from 'enzyme';
import _set from 'lodash/set';

import stringSupplant from '../../../utils/stringSupplant';
import JaegerAPI from '../../../api/jaeger';
import VerticalResizer from '../../common/VerticalResizer';
import { UnconnectedDetailsPanel as DetailsPanel } from './DetailsPanel';

describe('<SidePanel>', () => {
  const service = 'test svc';
  const opString = 'test op';
  const props = {
    decorationSchema: {
      detailUrl: 'http://test.detail.url?someParam=#{service}',
      detailPath: 'test.detail.path',
      opDetailUrl: 'http://test.opDetail.url?someParam=#{service}&otherParam=#{operation}',
      opDetailPath: 'test.opDetail.path',
      name: 'Decorating #{service}',
    },
    decorationValue: 'test decorationValue',
    service,
  };
  const supplantedUrl = stringSupplant(props.decorationSchema.detailUrl, { service });
  const supplantedOpUrl = stringSupplant(props.decorationSchema.opDetailUrl, {
    operation: opString,
    service,
  });
  let fetchDecorationSpy;
  let promise;
  let res;
  let rej;

  beforeAll(() => {
    fetchDecorationSpy = jest.spyOn(JaegerAPI, 'fetchDecoration').mockImplementation(() => {
      promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
      });
      return promise;
    });
  });

  beforeEach(() => {
    fetchDecorationSpy.mockClear();
  });

  describe('fetchDetails', () => {
    it('fetches correct details url, perferring op-scoped details, or does not fetch at all', async () => {
      const details = 'test details';
      const columnDefs = ['test', 'column', 'defs'];

      const tests = [];

      ['detailUrl#{service}', undefined].forEach(detailUrl => {
        ['detail.path.#{service}', undefined].forEach(detailPath => {
          ['detail.column.def.path.#{service}', undefined].forEach(detailColumnDefPath => {
            ['opDetailUrl#{service}#{operation}', undefined].forEach(opDetailUrl => {
              ['op.detail.path.#{service}.#{operation}', undefined].forEach(opDetailPath => {
                ['op.detail.column.def.path.#{service}', undefined].forEach(opDetailColumnDefPath => {
                  ['op', ['op0', 'op1'], undefined].forEach(operation => {
                    [{ message: 'Err obj with message' }, 'error message', false].forEach(error => {
                      [true, false].forEach(hasDetails => {
                        [true, false].forEach(hasColumnDefPath => {
                          tests.push(async () => {
                            fetchDecorationSpy.mockClear();
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

                            const setStateSpy = jest.spyOn(detailsPanel, 'setState').mockImplementation();
                            detailsPanel.fetchDetails();

                            let supplantedFetchUrl;
                            let supplantedColumnDefPath;
                            let supplantedDetailsPath;

                            if (
                              typeof opDetailUrl === 'string' &&
                              typeof opDetailPath === 'string' &&
                              typeof operation === 'string'
                            ) {
                              supplantedFetchUrl = stringSupplant(opDetailUrl, { service, operation });
                              supplantedDetailsPath = stringSupplant(opDetailPath, { service, operation });
                              if (opDetailColumnDefPath)
                                supplantedColumnDefPath = stringSupplant(opDetailColumnDefPath, {
                                  service,
                                  operation,
                                });
                            } else if (typeof detailUrl === 'string' && typeof detailPath === 'string') {
                              supplantedFetchUrl = stringSupplant(detailUrl, { service });
                              supplantedDetailsPath = stringSupplant(detailPath, { service });
                              if (detailColumnDefPath)
                                supplantedColumnDefPath = stringSupplant(detailColumnDefPath, { service });
                            } else {
                              expect(fetchDecorationSpy).not.toHaveBeenCalled();
                              return;
                            }

                            expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedFetchUrl);
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

      const errors = [];
      await Promise.all(tests.map(test => test().catch(err => errors.push(err))));
      if (errors.length) throw errors;
    });
  });

  describe('render', () => {
    it('renders', () => {
      const wrapper = shallow(<DetailsPanel {...props} />);
      wrapper.setState({ detailsLoading: false });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders with operation', () => {
      const wrapper = shallow(<DetailsPanel {...props} operation={opString} />);
      wrapper.setState({ detailsLoading: false });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders omitted array of operations', () => {
      const wrapper = shallow(<DetailsPanel {...props} operation={['op0', 'op1']} />);
      wrapper.setState({ detailsLoading: false });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders with progressbar', () => {
      const progressbar = <div>stand-in progressbar</div>;
      const wrapper = shallow(<DetailsPanel {...props} decorationProgressbar={progressbar} />);
      wrapper.setState({ detailsLoading: false });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders while loading', () => {
      const wrapper = shallow(<DetailsPanel {...props} />);
      expect(wrapper).toMatchSnapshot();
    });

    it('renders details', () => {
      const wrapper = shallow(<DetailsPanel {...props} />);
      wrapper.setState({ detailsLoading: false, details: 'details string' });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders details error', () => {
      const wrapper = shallow(<DetailsPanel {...props} />);
      wrapper.setState({ detailsLoading: false, details: 'details error', detailsErred: true });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders detailLink', () => {
      const schemaWithLink = {
        ...props.decorationSchema,
        detailLink: 'test details link',
      };
      const wrapper = shallow(<DetailsPanel {...props} decorationSchema={schemaWithLink} />);
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('componentDidMount', () => {
    it('fetches details', () => {
      expect(fetchDecorationSpy).not.toHaveBeenCalled();

      shallow(<DetailsPanel {...props} />);
      expect(fetchDecorationSpy).toHaveBeenCalled();
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedUrl);
    });
  });

  describe('componentDidUpdate', () => {
    const expectedState = expect.objectContaining({
      details: undefined,
      detailsErred: false,
      detailsLoading: true,
    });
    let wrapper;

    beforeEach(() => {
      wrapper = shallow(<DetailsPanel {...props} />);
      wrapper.setState({
        details: 'test details',
        detailsErred: false,
        detailsLoading: false,
      });
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedUrl);
    });

    it('fetches details and clears relevant state if decorationSchema changes', () => {
      const detailUrl = 'http://new.schema.detailsUrl?service=#{service}';
      const newSchema = {
        ...props.decorationSchema,
        detailUrl,
      };
      wrapper.setProps({ decorationSchema: newSchema });
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(2);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(stringSupplant(detailUrl, { service }));
      expect(wrapper.state()).toEqual(expectedState);
    });

    it('fetches details and clears relevant state if operation changes', () => {
      wrapper.setProps({ operation: opString });
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(2);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(supplantedOpUrl);
      expect(wrapper.state()).toEqual(expectedState);
    });

    it('fetches details and clears relevant state if service changes', () => {
      const newService = 'different test service';
      wrapper.setProps({ service: newService });
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(2);
      expect(fetchDecorationSpy).toHaveBeenLastCalledWith(
        stringSupplant(props.decorationSchema.detailUrl, { service: newService })
      );
      expect(wrapper.state()).toEqual(expectedState);
    });

    it('does nothing if decorationSchema, operation, and service are unchanged', () => {
      wrapper.setProps({ decorationValue: `not_${props.decorationValue}` });
      expect(fetchDecorationSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onResize', () => {
    it('updates state', () => {
      const width = 60;
      const wrapper = shallow(<DetailsPanel {...props} />);
      expect(wrapper.state('width')).not.toBe(width);

      wrapper.find(VerticalResizer).prop('onChange')(width);
      expect(wrapper.state('width')).toBe(width);
    });
  });
});
