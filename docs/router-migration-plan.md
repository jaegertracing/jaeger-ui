# Router Migration Plan

## Current State
- Using react-router-dom v5
- Using history v4
- Mix of class and functional components
- Direct history object usage

## Phase 1: Immediate Fix
1. Keep current dependencies:
   - history v4.6.3
   - react-router-dom v5.3.4
   - redux-first-history v4

2. Fix failing tests:
   - Update snapshot tests
   - Ensure history.length works correctly
   - Fix any UI issues

## Phase 2: Modernization
1. Component Migration:
   - Convert class components to functional components
   - Introduce hooks where appropriate
   - Update tests to use modern testing practices

2. Router Migration:
   - Replace history.push/replace with useNavigate
   - Update route configurations to v6 style
   - Remove direct history object usage
   - Update tests to use modern router testing approaches

3. Dependency Updates:
   - Upgrade to react-router-dom v6
   - Remove history dependency
   - Update redux-first-history if needed

## Phase 3: Future-Proofing
1. Prepare for React 19:
   - Ensure all components use hooks
   - Remove any legacy patterns
   - Update testing approaches

2. Documentation:
   - Update component documentation
   - Add migration guides
   - Document new routing patterns

## Implementation Strategy
1. Make changes incrementally
2. One component/route at a time
3. Maintain test coverage
4. Keep backwards compatibility during migration