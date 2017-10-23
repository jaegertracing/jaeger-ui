// Copyright (c) 2017 Uber Technologies, Inc.
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

import PropTypes from 'prop-types';
import React from 'react';
import colorGenerator from '../../utils/color-generator';

export default function TraceServiceTag({ service }) {
  const { name, numberOfSpans } = service;
  return (
    <div className="ui mini label" style={{ borderLeft: `5px solid ${colorGenerator.getColorByKey(name)}` }}>
      {name} ({numberOfSpans})
    </div>
  );
}

TraceServiceTag.propTypes = {
  service: PropTypes.shape({
    name: PropTypes.string.isRequired,
    numberOfSpans: PropTypes.number.isRequired,
  }).isRequired,
};
