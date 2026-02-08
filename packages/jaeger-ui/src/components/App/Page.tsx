// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import { ReduxState } from '../../types';
import { EmbeddedState } from '../../types/embedded';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';

type TProps = {
  children: React.ReactNode;
  embedded: EmbeddedState;
};

const { Header, Content } = Layout;

// export for tests
export const PageImpl: React.FC<TProps> = ({ children, embedded }) => {
  const location = useLocation();
  const { pathname, search } = location;

  React.useEffect(() => {
    trackPageView(pathname, search);
  }, [pathname, search]);

  const contentCls = cx({ 'Page--content': true, 'Page--content--no-embedded': !embedded });

  return (
    <div>
      <DocumentTitle title="Jaeger UI" />
      <Layout>
        {!embedded && (
          <Header className="Page--topNav">
            <TopNav />
          </Header>
        )}
        <Content className={contentCls}>{children}</Content>
      </Layout>
    </div>
  );
};

// export for tests
export function mapStateToProps(state: ReduxState) {
  const { embedded } = state;
  return { embedded };
}

export default connect(mapStateToProps)(PageImpl);
