// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Location } from 'history';

/**
 * Interface representing route-related props passed to the enhanced component.
 * @interface
 * @property {Location} location - The current location object containing information about the URL.
 * @property {string} pathname - The current URL pathname.
 * @property {string} search - The current URL search string.
 * @property {object} params - The URL parameters.
 */
export type IWithRouteProps = {
  location: Location;
  pathname: string;
  search: string;
  params: object;
};

/**
 * Enhances a React component with route-related props. Works similar to withRouter export from react-router-dom v5 below.
 * @function
 * @param {React.ElementType} WrappedComponent - The component to be enhanced.
 * @returns {React.Component} A higher-order component with route-related props.
 */
export default function withRouteProps(WrappedComponent: React.ElementType) {
  /**
   * @function
   * @param {IWithRouteProps|object} props - The props passed to the enhanced component.
   * @returns {React.Component} The enhanced component with additional route-related props.
   */
  return function WithRouteProps(props: IWithRouteProps | object) {
    /**
     * The current location object containing information about the URL.
     * @type {Location}
     */
    const location = useLocation();

    /**
     * The URL parameters extracted from the route.
     * @type {object}
     */
    const params = useParams();

    /**
     * The current URL pathname.
     * @type {string}
     */
    const { pathname } = location;

    /**
     * The current URL search string.
     * @type {string}
     */
    const { search } = location;

    /**
     * Renders the enhanced component with route-related props.
     * @returns {React.Component} The enhanced component with additional route-related props.
     */
    return (
      <WrappedComponent {...props} location={location} pathname={pathname} search={search} params={params} />
    );
  };
}
