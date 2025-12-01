# Copilot Instructions for Jaeger UI

## Project Overview

Jaeger UI is a React-based visualization tool for distributed tracing. It's built as a monorepo with multiple packages using npm workspaces.

## Repository Structure

```
jaeger-ui/
├── packages/
│   ├── jaeger-ui/          # Main React application (Vite + React 19)
│   │   ├── src/
│   │   │   ├── actions/    # Redux actions
│   │   │   ├── api/        # API layer
│   │   │   ├── components/ # React components
│   │   │   ├── reducers/   # Redux reducers
│   │   │   ├── selectors/  # Redux selectors
│   │   │   ├── types/      # TypeScript types
│   │   │   └── utils/      # Utility functions
│   │   └── test/           # Test utilities and setup
│   └── plexus/             # Directed graph visualization library
│       └── src/
│           ├── Digraph/    # Graph components
│           ├── LayoutManager/
│           └── zoom/       # Zoom functionality
├── scripts/                # Build and utility scripts
└── typings/                # Global TypeScript declarations
```

## Development Setup

### Prerequisites

- Node.js >= 24 (managed via nvm, see `.nvmrc`)
- npm package manager

### Installation

```bash
nvm use        # Use the correct Node version
npm ci         # Install dependencies (use 'ci' for clean install)
```

## Build, Lint, and Test Commands

### Root Level Commands (run from repository root)

| Command                 | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `npm start`             | Start development server with hot reload (runs jaeger-ui)      |
| `npm run build`         | Build all packages for production                              |
| `npm run lint`          | Run all linters (prettier, typescript, eslint, license checks) |
| `npm run eslint`        | Run ESLint on all packages                                     |
| `npm run prettier`      | Format code with Prettier                                      |
| `npm run prettier-lint` | Check formatting without making changes                        |
| `npm run tsc-lint`      | Run TypeScript type checking                                   |
| `npm test`              | Run all tests across packages                                  |

### Package-Specific Commands

Run from `packages/jaeger-ui/`:

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm test`         | Run Jest tests                 |
| `npm test <file>`  | Run tests for a specific file  |
| `npm run coverage` | Run tests with coverage report |
| `npm run build`    | Build for production           |
| `npm start`        | Start dev server               |

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Interface names must be prefixed with `I` (e.g., `ISpan`, `ITrace`)
- Run `npm run tsc-lint` to type-check

### Code Style

- Use Prettier for formatting (`npm run prettier`)
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use single quotes for strings
- Trailing commas in ES5 style
- Print width: 110 characters

### React Components

- Use functional components with hooks for new code
- Component files use `.tsx` extension
- Test files are co-located with components (e.g., `Component.tsx` and `Component.test.js`)
- Use snapshot testing for React components

### File Headers

All new files must include this copyright header:

```typescript
// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
```

## Testing

- Uses Jest with jsdom environment
- React Testing Library for component testing
- Tests are co-located with source files (`*.test.js` or `*.test.tsx`)
- Run individual tests: `npm test -- --testPathPattern=<pattern>`
- Update snapshots: `npm run update-snapshots`

### Test Coverage

```bash
npm test -- --coverage
npm test -- --coverage --collectCoverageFrom="src/path/to/file.tsx"
```

## Common Patterns

### Redux

- Actions are in `src/actions/`
- Reducers are in `src/reducers/`
- Selectors are in `src/selectors/`
- Uses redux-actions for action creators
- Uses redux-promise-middleware for async actions

### Component Structure

Components typically follow this pattern:

```
ComponentName/
├── index.tsx          # Main component
├── index.test.js      # Tests
├── ComponentName.css  # Styles (if any)
└── types.ts           # Component-specific types (if needed)
```

### Styling

- Uses CSS modules and Less
- Base CSS utilities from u-basscss
- Ant Design (antd v6) for UI components

## Dependencies

- **React 19** with React DOM
- **Redux** for state management
- **React Router v5** for routing
- **Ant Design v6** for UI components
- **Vite** for build tooling
- **Jest** for testing

## Commits

- Sign all commits with DCO (`git commit -s`)
- Follow [conventional commit](https://chris.beams.io/posts/git-commit/) guidelines
- Keep subject line under 50 characters
- Use imperative mood in subject line

## Additional Notes

- The `plexus` package is a directed graph visualization library used by jaeger-ui
- Development server proxies API requests to `http://localhost:16686` (Jaeger Query service)
- Use `npm ci` instead of `npm install` for clean installs in CI/CD
