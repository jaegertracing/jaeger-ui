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

import CircularProgressbar from '../common/CircularProgressbar';
import NewWindowIcon from '../common/NewWindowIcon';

import { TQualityMetrics } from './types';

import './BannerText.css';

export type TProps = {
  bannerText: TQualityMetrics["bannerText"];
}

export default class BannerText extends React.PureComponent<TProps> {
  render() {
    const {
      bannerText
    } = this.props;
    if (!bannerText) return null;

    const { styling = undefined } = typeof bannerText === 'object' ? bannerText : {};
    const text = typeof bannerText === 'object' ? bannerText.value : bannerText;

    return (
      <div className="BannerText" style={styling}>
        {text}
      </div>
    );
  }
}
