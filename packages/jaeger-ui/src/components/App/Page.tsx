// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Layout } from 'antd';
import cx from 'classnames';
import { useLocation } from 'react-router-dom';

import TopNav from './TopNav';
import { EmbeddedState } from '../../types/embedded';
import { getEmbeddedFromUrl } from '../../stores/embedded-store';
import { trackPageView } from '../../utils/tracking';
import DocumentTitle from '../../utils/documentTitle';

import './Page.css';
import withRouteProps from '../../utils/withRouteProps';

type TProps = {
  children: React.ReactNode;
  embedded?: EmbeddedState | null;
};

const { Header, Content } = Layout;

// export for tests
export const PageImpl: React.FC<TProps> = props => {
  const embedded = props.embedded === undefined ? getEmbeddedFromUrl() : props.embedded;
  const { children } = props;
  const { pathname, search } = useLocation();
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

export default withRouteProps(PageImpl);
