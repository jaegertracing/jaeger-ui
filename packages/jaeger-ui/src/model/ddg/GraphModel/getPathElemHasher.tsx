// Copyright (c) 2019 Uber Technologies, Inc.
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

import GraphModel from '.';
import { PathElem, EDdgDensity } from '../types';

type TPathElemToStr = (pe: PathElem) => string;

function fmtElemShowOp(pe: PathElem) {
  return `${pe.operation.service.name}\t${pe.operation.name}`;
}

function fmtElemSvcOnly(pe: PathElem) {
  return pe.distance === 0 ? fmtElemShowOp(pe) : pe.operation.service.name;
}

function getElemsToFocal(pe: PathElem) {
  const {
    memberIdx,
    memberOf: { focalIdx, members },
  } = pe;
  return members.slice(Math.min(focalIdx, memberIdx), Math.max(focalIdx, memberIdx) + 1);
}

function getPpeHasher(elemToStr: TPathElemToStr) {
  return (pe: PathElem) =>
    getElemsToFocal(pe)
      .map(elemToStr)
      .join('\n');
}

function getExtVsIntHasher(elemToStr: TPathElemToStr) {
  return (pe: PathElem) =>
    `${getElemsToFocal(pe)
      .map(elemToStr)
      .join('\n')}${pe.isExternal ? '; is-external' : ''}`;
}

// It might make sense for this function live on PathElem so that pathElems can
// be compared when checking how many inbound/outbound edges are visible for a
// vertex, but maybe not as vertices could be densitiy-aware and provide that to
// this fn. could also be property on pathElem that gets set by showElems
// tl;dr may move in late-alpha.
export default function getPathElemHasher(this: GraphModel) {
  const elemToStr = this.showOp ? fmtElemShowOp : fmtElemSvcOnly;

  switch (this.density) {
    case EDdgDensity.MostConcise: {
      return elemToStr;
    }
    case EDdgDensity.UpstreamVsDownstream: {
      return (pe: PathElem) => `${elemToStr(pe)}; direction=${Math.sign(pe.distance)}`;
    }
    case EDdgDensity.OnePerLevel: {
      return (pe: PathElem) => `${elemToStr(pe)}; distance=${pe.distance}`;
    }
    case EDdgDensity.PreventPathEntanglement: {
      return getPpeHasher(elemToStr);
    }
    case EDdgDensity.ExternalVsInternal: {
      return getExtVsIntHasher(elemToStr);
    }
    default: {
      throw new Error(
        `Density: ${this.density} has not been implemented, try one of these: ${JSON.stringify(
          EDdgDensity,
          null,
          2
        )}`
      );
    }
  }
}
