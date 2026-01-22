# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Jaeger UI project. ADRs document important architectural decisions made during the development of Jaeger UI, including the context, decision, and consequences of each choice.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help teams understand why certain decisions were made and provide historical context for future contributors.

## ADRs in This Repository

- [ADR-0001: Design Token-Based Theming Architecture](./0001-design-token-based-theming.md) - Proposed approach for implementing dark mode and theming using CSS custom properties and design tokens
- [ADR-0002: Migration from Legacy Jaeger Data Model to OTLP via API v3](./0002-otlp-api-v3-migration.md) - Comprehensive plan for migrating from legacy Jaeger JSON data model to OpenTelemetry Protocol (OTLP) data model via API v3 endpoints
- [ADR-0003: Span Color Palette for Trace Visualization](./0003-span-color-palette.md) - Selection and architecture for a theme-aware, 20-color qualitative palette for span visualization
- [ADR-0004: State Management Strategy for Jaeger UI](./0004-state-management-strategy.md) - Long-term architectural strategy for state management, recommending Zustand and TanStack Query
- [ADR-0005: Current State Management Architecture](./0005-current-state-management-architecture.md) - Documentation of the existing multi-layered state management (Redux, TanStack Query, URL, Local Storage)
