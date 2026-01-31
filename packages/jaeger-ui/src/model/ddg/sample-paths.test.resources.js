// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const simplePayloadElemMaker = label => ({
  operation: `${label}Operation`,
  service: `${label}Service`,
});

export const focalPayloadElem = simplePayloadElemMaker('focal');

const sameFocalServicePayloadElem = {
  operation: 'someOtherOperation',
  service: focalPayloadElem.service,
};

const pathLengthener = path => {
  const prequels = [];
  const sequels = [];
  path.forEach(({ operation, service }) => {
    if (operation !== focalPayloadElem.operation && service !== focalPayloadElem.service) {
      prequels.push({
        operation: `prequel-${operation}`,
        service,
      });
      sequels.push({
        operation,
        service: `sequel-${service}`,
      });
    }
  });
  return [...prequels, ...path, ...sequels];
};

export const firstPayloadElem = simplePayloadElemMaker('first');
export const beforePayloadElem = simplePayloadElemMaker('before');
export const midPayloadElem = simplePayloadElemMaker('mid');
export const afterPayloadElem = simplePayloadElemMaker('after');
export const lastPayloadElem = simplePayloadElemMaker('last');

export const shortPath = [beforePayloadElem, focalPayloadElem];
export const simplePath = [
  firstPayloadElem,
  beforePayloadElem,
  focalPayloadElem,
  afterPayloadElem,
  lastPayloadElem,
];
export const longSimplePath = pathLengthener(simplePath);
export const noFocalPath = [
  firstPayloadElem,
  beforePayloadElem,
  midPayloadElem,
  afterPayloadElem,
  lastPayloadElem,
];
export const doubleFocalPath = [
  firstPayloadElem,
  beforePayloadElem,
  focalPayloadElem,
  midPayloadElem,
  focalPayloadElem,
  afterPayloadElem,
  lastPayloadElem,
];
export const almostDoubleFocalPath = [
  firstPayloadElem,
  beforePayloadElem,
  sameFocalServicePayloadElem,
  midPayloadElem,
  focalPayloadElem,
  afterPayloadElem,
  lastPayloadElem,
];

const divergentPayloadElem = simplePayloadElemMaker('divergentPayloadElem');
export const convergentPaths = [
  [firstPayloadElem, focalPayloadElem, divergentPayloadElem, afterPayloadElem, lastPayloadElem],
  [firstPayloadElem, focalPayloadElem, midPayloadElem, afterPayloadElem, lastPayloadElem],
];

const generationPayloadElems = {
  afterFocalMid: simplePayloadElemMaker('afterFocalMid'),
  afterTarget0: simplePayloadElemMaker('afterTarget0'),
  afterTarget1: simplePayloadElemMaker('afterTarget1'),
  beforeFocalMid: simplePayloadElemMaker('beforeFocalMid'),
  beforeTarget0: simplePayloadElemMaker('beforeTarget0'),
  beforeTarget1: simplePayloadElemMaker('beforeTarget1'),
  target: simplePayloadElemMaker('target'),
};

export const generationPaths = [
  [
    generationPayloadElems.beforeTarget0,
    generationPayloadElems.target,
    generationPayloadElems.beforeFocalMid,
    focalPayloadElem,
  ],
  [
    generationPayloadElems.beforeTarget1,
    generationPayloadElems.target,
    generationPayloadElems.beforeFocalMid,
    focalPayloadElem,
  ],
  [focalPayloadElem, generationPayloadElems.afterFocalMid, generationPayloadElems.target],
  [
    focalPayloadElem,
    generationPayloadElems.afterFocalMid,
    generationPayloadElems.target,
    generationPayloadElems.afterTarget0,
  ],
  [
    focalPayloadElem,
    generationPayloadElems.afterFocalMid,
    generationPayloadElems.target,
    generationPayloadElems.afterTarget1,
  ],
  [generationPayloadElems.target, generationPayloadElems.beforeFocalMid, focalPayloadElem],
];

export const wrap = paths => ({
  dependencies: paths.map(path => ({ path, attributes: [] })),
});
