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

export const FOCAL_KEY = 'focalKey';

function fmtElemShowOp(pe: PathElem) {
  return pe.distance === 0 ? FOCAL_KEY : `${pe.operation.service.name}\t${pe.operation.name}`;
}

function fmtElemSvcOnly(pe: PathElem) {
  return pe.distance === 0 ? FOCAL_KEY : pe.operation.service.name;
}

function getPpeHasher(elemToStr: TPathElemToStr) {
  return (pe: PathElem) => pe.focalPath.map(elemToStr).join('\n');
}

function getExtVsIntHasher(elemToStr: TPathElemToStr) {
  return (pe: PathElem) => `${getPpeHasher(elemToStr)(pe)}${pe.isExternal ? '; is-external' : ''}`;
}

// This function is bound to a GraphModel and returns a different hasher based on the model's layout settings
export default function getPathElemHasher(this: GraphModel): TPathElemToStr {
  const elemToStr = this.showOp ? fmtElemShowOp : fmtElemSvcOnly;

  switch (this.density) {
    case EDdgDensity.MostConcise: {
      return (pe: PathElem) => {
        const { members, focalIdx } = pe.memberOf;
        const focalElem = members[focalIdx];
        if (pe.operation.service.name === focalElem.operation.service.name) {
          if (pe === focalElem || !this.showOp) return FOCAL_KEY;

          const focalVertex = this.vertices.get(FOCAL_KEY);
          // istanbul ignore next : Unreachable error to appease TS, transformDdgData would have thrown
          if (!focalVertex) throw new Error('No focal vertex found');
          const focalElems = this.vertexToPathElems.get(focalVertex);
          // istanbul ignore next : Unreachable error to appease TS, transformDdgData would have thrown
          if (!focalElems) throw new Error('No focal elems found');

          // Because pathElems are processed in increasing order of absolute distance, the following set will
          // never be incomplete.
          const focalOps = new Set(Array.from(focalElems).map(({ operation }) => operation.name));
          if (focalOps.has(pe.operation.name)) return FOCAL_KEY;
        }
        return elemToStr(pe);
      };
    }
    case EDdgDensity.UpstreamVsDownstream: {
      return (pe: PathElem) =>
        pe.distance ? `${elemToStr(pe)}; direction=${Math.sign(pe.distance)}` : FOCAL_KEY;
    }
    case EDdgDensity.OnePerLevel: {
      return (pe: PathElem) => (pe.distance ? `${elemToStr(pe)}; distance=${pe.distance}` : FOCAL_KEY);
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
