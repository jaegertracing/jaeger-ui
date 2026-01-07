// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useServices, useSpanNames } from '../../hooks/useOtlpMetadata';
import SearchFormImpl from './SearchForm';
import LoadingIndicator from '../common/LoadingIndicator';

/**
 * Wrapper component that fetches services and span names using React Query
 * and passes them to the existing SearchForm component.
 *
 * This wrapper allows us to migrate to the OTLP API v3 without modifying
 * the existing SearchForm component.
 */
export function SearchFormWithOtlpMetadata(props: any) {
  const { data: servicesList, isLoading: isLoadingServices, error: servicesError } = useServices();

  // Get the currently selected service from props or local storage
  const selectedService = props.initialValues?.service;

  // Fetch span names for the selected service
  const { data: spanNames, isLoading: isLoadingSpanNames } = useSpanNames(
    selectedService && selectedService !== '-' ? selectedService : null
  );

  // Show loading indicator while services are being fetched
  if (isLoadingServices) {
    return <LoadingIndicator />;
  }

  // Show error if services failed to load
  if (servicesError) {
    return <div className="SearchForm--error">Error loading services: {servicesError.message}</div>;
  }

  // Transform services data to match the expected format
  // The existing SearchForm expects: { name: string, operations: string[] }[]
  const services = (servicesList || []).map(serviceName => ({
    name: serviceName,
    operations: selectedService === serviceName ? spanNames || [] : [],
  }));

  // Pass through all props to SearchForm, with services from React Query
  return <SearchFormImpl {...props} services={services} submitting={isLoadingSpanNames} />;
}

export default SearchFormWithOtlpMetadata;
