// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Dropdown } from 'antd';
import * as React from 'react';
import { Hyperlink } from '../../types/hyperlink';
import NewWindowIcon from './NewWindowIcon';

type ExternalLinksProps = {
  links: Hyperlink[];
};

const LinkValue = (props: {
  href: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <a
    href={props.href}
    title={props.title}
    target="_blank"
    rel="noopener noreferrer"
    className={props.className}
  >
    {props.children} <NewWindowIcon />
  </a>
);

// export for testing
export const linkValueList = (links: Hyperlink[]) => {
  const dropdownItems = links.map(({ text, url }, index) => ({
    label: (
      <LinkValue href={url} title={text}>
        {text}
      </LinkValue>
    ),
    key: `${url}-${index}`,
  }));

  return dropdownItems;
};

// ExternalLinks are displayed as a menu at the trace level.
// Example: https://github.com/jaegertracing/jaeger-ui/assets/94157520/7f0d84bc-c2fb-488c-9e50-1ec9484ea1e6
export default function ExternalLinks(props: ExternalLinksProps) {
  const { links } = props;

  if (links.length === 1) {
    return <LinkValue href={links[0].url} title={links[0].text} className="TracePageHeader--back" />;
  }

  return (
    <Dropdown menu={{ items: linkValueList(links) }} placement="bottomRight" trigger={['click']}>
      <a className="TracePageHeader--back" data-testid="dropdown">
        <NewWindowIcon isLarge />
      </a>
    </Dropdown>
  );
}
