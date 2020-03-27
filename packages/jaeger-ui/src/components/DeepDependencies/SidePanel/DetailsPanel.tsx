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

import * as React from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import { connect } from 'react-redux';

import 'react-circular-progressbar/dist/styles.css';

import extractDecorationFromState, { TDecorationFromState } from '../../../model/path-agnostic-decorations';
import { TPathAgnosticDecorationSchema } from '../../../model/path-agnostic-decorations/types';

type TProps = TDecorationFromState & {
  decorationSchema: TPathAgnosticDecorationSchema;
  service: string;
  operation?: string | string[] | null;
};

export class UnconnectedDetailsPanel extends React.PureComponent<TProps> {
  render() {
    const { decorationColor, decorationMax, decorationValue, operation, service } = this.props;
    return (
      <div>
        <div>
          <span>{service}</span>{operation && (
          <span>::{operation}</span>
          )}
        </div>
        {typeof decorationValue === 'number' && typeof decorationMax === 'number'  && <CircularProgressbar
          background
          styles={{
            path: {
              stroke: decorationColor,
              strokeLinecap: 'butt',
            },
            text: {
              fill: decorationColor,
            },
          }}
          maxValue={decorationMax}
          text={`${decorationValue}`}
          value={decorationValue}
        />}
      </div>
    )
  }
}

export default connect(extractDecorationFromState)(UnconnectedDetailsPanel);
