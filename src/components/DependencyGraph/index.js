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
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Menu } from 'semantic-ui-react';

import './DependencyGraph.css';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { formatDependenciesAsNodesAndLinks } from '../../selectors/dependencies';
import NotFound from '../App/NotFound';
import { nodesPropTypes, linksPropTypes } from '../../propTypes/dependencies';

import DependencyForceGraph from './DependencyForceGraph';
import DAG from './DAG';

export default class DependencyGraphPage extends Component {
  static get propTypes() {
    return {
      dependencies: PropTypes.any,
      fetchDependencies: PropTypes.func.isRequired,
      nodes: nodesPropTypes,
      links: linksPropTypes,
      loading: PropTypes.bool,
      error: PropTypes.object,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      graphType: 'FORCE_DIRECTED',
    };
  }
  componentDidMount() {
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

    const GRAPH_TYPE_OPTIONS = [{ type: 'FORCE_DIRECTED', name: 'Force Directed Graph' }];

    if (dependencies.length <= 100) {
      GRAPH_TYPE_OPTIONS.push({ type: 'DAG', name: 'DAG' });
    }
    return (
      <div className="my2">
        <Menu tabular>
          {GRAPH_TYPE_OPTIONS.map(option =>
            <Menu.Item
              active={graphType === option.type}
              key={option.type}
              name={option.name}
              onClick={() => this.handleGraphTypeChange(option.type)}
            />
          )}
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

// export connected component separately
function mapStateToProps(state) {
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

function mapDispatchToProps(dispatch) {
  const { fetchDependencies } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDependencies };
}

export const ConnectedDependencyGraphPage = connect(mapStateToProps, mapDispatchToProps)(DependencyGraphPage);
