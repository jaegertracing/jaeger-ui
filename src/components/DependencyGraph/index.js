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
import _get from 'lodash/get';
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Menu } from 'semantic-ui-react';

import DAG from './DAG';
import DependencyForceGraph from './DependencyForceGraph';
import NotFound from '../App/NotFound';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';
import { formatDependenciesAsNodesAndLinks } from '../../selectors/dependencies';
import getConfig from '../../utils/config/get-config';
import { FALLBACK_DAG_MAX_NUM_SERVICES } from '../../constants';

import './DependencyGraph.css';

// export for tests
export const GRAPH_TYPES = {
  FORCE_DIRECTED: { type: 'FORCE_DIRECTED', name: 'Force Directed Graph' },
  DAG: { type: 'DAG', name: 'DAG' },
};

const dagMaxNumServices =
  _get(getConfig(), 'dependencies.dagMaxNumServices') || FALLBACK_DAG_MAX_NUM_SERVICES;

export default class DependencyGraphPage extends Component {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    dependencies: PropTypes.any.isRequired,
    fetchDependencies: PropTypes.func.isRequired,
    nodes: nodesPropTypes,
    links: linksPropTypes,
    loading: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    error: PropTypes.object,
  };

  static defaultProps = {
    nodes: null,
    links: null,
    error: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      graphType: 'FORCE_DIRECTED',
    };
  }
  componentWillMount() {
    this.props.fetchDependencies();
  }

  handleGraphTypeChange(graphType) {
    this.setState({ graphType });
  }

  render() {
    const { nodes, links, error, dependencies, loading } = this.props;
    const { graphType } = this.state;
    if (loading) {
      return (
        <div className="m1">
          <div className="ui active centered inline loader" />
        </div>
      );
    }
    if (error) {
      return <NotFound error={error} />;
    }

    if (!nodes || !links) {
      return (
        <div className="m1">
          <div className="ui warning message">
            <div className="header">No service dependencies found.</div>
          </div>
        </div>
      );
    }

    const GRAPH_TYPE_OPTIONS = [GRAPH_TYPES.FORCE_DIRECTED];

    if (dependencies.length <= dagMaxNumServices) {
      GRAPH_TYPE_OPTIONS.push(GRAPH_TYPES.DAG);
    }
    return (
      <div className="my2">
        <Menu tabular>
          {GRAPH_TYPE_OPTIONS.map(option => (
            <Menu.Item
              active={graphType === option.type}
              key={option.type}
              name={option.name}
              onClick={() => this.handleGraphTypeChange(option.type)}
            />
          ))}
        </Menu>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 15,
            left: 15,
            top: 120,
            overflow: 'hidden',
            background: 'whitesmoke',
          }}
        >
          {graphType === 'FORCE_DIRECTED' && <DependencyForceGraph nodes={nodes} links={links} />}
          {graphType === 'DAG' && <DAG serviceCalls={dependencies} />}
        </div>
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state) {
  const { dependencies, error, loading } = state.dependencies;
  let links;
  let nodes;
  if (dependencies && dependencies.length > 0) {
    const formatted = formatDependenciesAsNodesAndLinks({ dependencies });
    links = formatted.links;
    nodes = formatted.nodes;
  }
  return { loading, error, nodes, links, dependencies };
}

// export for tests
export function mapDispatchToProps(dispatch) {
  const { fetchDependencies } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDependencies };
}

export const ConnectedDependencyGraphPage = connect(mapStateToProps, mapDispatchToProps)(DependencyGraphPage);
