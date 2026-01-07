// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { connect } from 'react-redux';
import { useServices, useSpanNames } from '../../hooks/useOtlpMetadata';
import { SearchFormImpl, mapStateToProps, mapDispatchToProps } from './SearchForm';

/**
 * Wrapper component that fetches services and span names using React Query
 * and passes them to the existing SearchForm component.
 *
 * This wrapper allows us to migrate to the OTLP API v3 without modifying
 * the existing SearchForm component.
 */
export function SearchFormWithOtlpMetadata(props: any) {
  const [currentService, setCurrentService] = useState<string | undefined>(props.initialValues?.service);

  const { data: servicesList, isLoading: isLoadingServices, error: servicesError } = useServices();

  // Fetch span names for the currently selected service
  const { data: spanNames, isLoading: isLoadingSpanNames } = useSpanNames(
    currentService && currentService !== '-' ? currentService : null
  );

  const handleServiceChange = (service: string) => {
    setCurrentService(service);
    props.changeServiceHandler(service);
  };

  if (servicesError) {
    return <div className="SearchForm--error">Error loading services: {servicesError.message}</div>;
  }

  // Transform services data to match the expected format
  // The existing SearchForm expects: { name: string, operations: string[] }[]
  const services = (servicesList || []).map(serviceName => ({
    name: serviceName,
    operations: currentService === serviceName ? spanNames || [] : [],
  }));

  // Pass through all props to SearchForm, with services from React Query
  return (
    <SearchFormImpl
      {...props}
      services={services}
      isLoadingServices={isLoadingServices}
      isLoadingSpanNames={isLoadingSpanNames}
      changeServiceHandler={handleServiceChange}
    />
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchFormWithOtlpMetadata);
