# Theming Implementation Checklist

This checklist tracks the implementation of the design token-based theming system as outlined in [ADR-0001](../adr/0001-design-token-based-theming.md).

**IMPORTANT:** Phases must be completed in order. Do NOT skip Phase 0!

## Phase 0: Discovery & Analysis ⭐ CRITICAL FIRST STEP

### 0.1 Comprehensive Color Audit
- [ ] Create `scripts/audit-colors.js` (see ADR Appendix A)
- [ ] Run audit script: `node scripts/audit-colors.js > color-audit-report.txt`
- [ ] Review audit report
- [ ] Identify top 30 most-used colors
- [ ] Identify colors by CSS property (background, color, border, etc.)
- [ ] Save `color-audit-detailed.json` for migration tool
- [ ] Document findings in team meeting

### 0.2 Analyze Existing CSS Variables
- [ ] Run: `grep -rn "^\s*--" packages/jaeger-ui/src --include="*.css"`
- [ ] Document existing variables (--tx-color-*, --nav-height, etc.)
- [ ] Assess consistency of existing variable usage
- [ ] Decide: migrate existing variables or keep as aliases?
- [ ] Document decision in `docs/theming/existing-variables-decision.md`

### 0.3 Component Categorization
- [ ] Run: `find packages/jaeger-ui/src/components -name "*.css" -exec wc -l {} \; | sort -rn > css-complexity.txt`
- [ ] Count total CSS files
- [ ] Create `docs/theming/component-inventory.md`
- [ ] Categorize components: High/Medium/Low priority
- [ ] Identify high-traffic pages (SearchForm, TracePage, TopNav)
- [ ] Identify rarely-used pages
- [ ] Review inventory with team

### 0.4 Derive Token Taxonomy from Real Data
- [ ] Create `docs/theming/token-taxonomy.md`
- [ ] Document methodology (based on audit, not assumptions)
- [ ] Define Surface tokens based on background-color audit
- [ ] Define Text tokens based on color property audit
- [ ] Define Border tokens based on border/border-color audit
- [ ] Define Interactive tokens based on button/link audit
- [ ] Define Feedback tokens (if found in audit)
- [ ] Define Shadow tokens based on box-shadow audit
- [ ] Define Special purpose tokens (trace colors, nav height, etc.)
- [ ] Include actual color values and occurrence counts
- [ ] Review taxonomy with designer
- [ ] Get team approval on taxonomy

### 0.5 Create Migration Mapping
- [ ] Create `docs/theming/migration-mapping.md`
- [ ] Build quick reference table (old value → new token)
- [ ] Add context column (where it's used)
- [ ] Create per-component migration guides
- [ ] Include line numbers from audit
- [ ] Review mapping with team
- [ ] Ensure mapping covers all top 30 colors

**Phase 0 Deliverables:**
- [ ] ✅ `color-audit-report.txt` exists and reviewed
- [ ] ✅ `color-audit-detailed.json` exists
- [ ] ✅ `docs/theming/component-inventory.md` exists
- [ ] ✅ `docs/theming/token-taxonomy.md` exists and approved
- [ ] ✅ `docs/theming/migration-mapping.md` exists
- [ ] ✅ Team understands the approach
- [ ] ✅ Designer has reviewed and approved token taxonomy

---

## Phase 1: Centralize Colors

### 1.1 Create Centralized Color Variables
- [ ] Create `packages/jaeger-ui/src/styles/color-variables.css`
- [ ] Add file header with documentation
- [ ] Define Surface tokens (from Phase 0 taxonomy)
- [ ] Define Text tokens (from Phase 0 taxonomy)
- [ ] Define Border tokens (from Phase 0 taxonomy)
- [ ] Define Interactive tokens (from Phase 0 taxonomy)
- [ ] Define Feedback tokens (from Phase 0 taxonomy)
- [ ] Define Shadow tokens (from Phase 0 taxonomy)
- [ ] Define Special purpose tokens (from Phase 0 taxonomy)
- [ ] Add comments linking to audit findings
- [ ] Import in `packages/jaeger-ui/src/components/App/index.jsx` FIRST
- [ ] Test that variables are accessible in browser DevTools

### 1.2 Create Theme Provider Component
- [ ] Create `packages/jaeger-ui/src/components/App/ThemeProvider.tsx`
- [ ] Implement `ThemeModeContext` with React Context
- [ ] Implement `useThemeMode()` hook
- [ ] Add localStorage persistence logic
- [ ] Add system preference detection (`prefers-color-scheme`)
- [ ] Add `document.body.dataset.theme` update logic
- [ ] Integrate Ant Design `ConfigProvider` with theme
- [ ] Map CSS variables to Ant Design tokens
- [ ] Write unit tests for ThemeProvider
- [ ] Test localStorage edge cases (quota exceeded, blocked)
- [ ] Test SSR compatibility

### 1.3 Create Theme Toggle Component
- [ ] Create `packages/jaeger-ui/src/components/App/ThemeToggleButton.tsx`
- [ ] Create `packages/jaeger-ui/src/components/App/ThemeToggleButton.css`
- [ ] Add sun/moon icons
- [ ] Add accessibility attributes (aria-label, aria-pressed)
- [ ] Style using design tokens
- [ ] Add tooltip
- [ ] Write unit tests

### 1.4 Integrate Theme Provider
- [ ] Update `packages/jaeger-ui/src/components/App/index.jsx`
- [ ] Wrap app in `<AppThemeProvider>`
- [ ] Import `theme-tokens.css` before other styles
- [ ] Add `<ThemeToggleButton>` to TopNav
- [ ] Test theme switching works end-to-end
- [ ] Verify localStorage persistence
- [ ] Verify system preference detection

## Phase 2: Create Migration Tooling

### 2.1 Color Audit Script
- [ ] Create `scripts/audit-colors.js`
- [ ] Add regex patterns for hex, rgb, hsl colors
- [ ] Add logic to skip CSS variables
- [ ] Add file scanning with glob
- [ ] Add grouping by color value
- [ ] Add JSON export for migration tool
- [ ] Run audit and review results
- [ ] Document most common colors

### 2.2 Color Mapping Guide
- [ ] Create `docs/theming/color-migration-guide.md`
- [ ] Document common color mappings
- [ ] Create decision tree for choosing tokens
- [ ] Add migration process steps
- [ ] Add examples for each token category
- [ ] Review with team

### 2.3 ESLint Rule (Optional but Recommended)
- [ ] Create `eslint-rules/no-hardcoded-colors.js`
- [ ] Add to ESLint configuration
- [ ] Test rule catches hardcoded colors
- [ ] Add to CI/CD pipeline
- [ ] Document exceptions (if any)

## Phase 3: Incremental Migration

### Priority 1 - Foundation
- [ ] Migrate `packages/jaeger-ui/src/components/App/index.css`
- [ ] Migrate `packages/jaeger-ui/src/components/App/Page.css`
- [ ] Migrate `packages/jaeger-ui/src/components/App/TopNav.css`
- [ ] Migrate `packages/jaeger-ui/src/components/common/vars.css`
- [ ] Migrate `packages/jaeger-ui/src/components/common/utils.css`
- [ ] Test foundation components in both themes
- [ ] Visual regression tests for foundation

### Priority 2 - High-Traffic Pages
- [ ] Migrate `SearchTracePage/index.css`
- [ ] Migrate `SearchTracePage/SearchForm.css`
- [ ] Migrate `SearchTracePage/SearchResults/*.css`
- [ ] Migrate `SearchTracePage/FileLoader.css`
- [ ] Migrate `TracePage/**/*.css`
- [ ] Test search page in both themes
- [ ] Test trace page in both themes
- [ ] Visual regression tests

### Priority 3 - Secondary Pages
- [ ] Migrate `DependencyGraph/**/*.css`
- [ ] Migrate `Monitor/**/*.css`
- [ ] Migrate `QualityMetrics/**/*.css`
- [ ] Test all secondary pages
- [ ] Visual regression tests

### Priority 4 - Remaining Components
- [ ] Audit remaining CSS files
- [ ] Create migration plan for remaining files
- [ ] Migrate remaining components
- [ ] Test all components
- [ ] Full visual regression test suite

## Phase 4: Ant Design Integration

### 4.1 Sync Ant Design Theme
- [ ] Update ThemeProvider to read CSS variables
- [ ] Map all relevant Ant Design tokens
- [ ] Test Ant Design components (Button, Input, Select, etc.)
- [ ] Test Ant Design modals and overlays
- [ ] Test Ant Design form components
- [ ] Document Ant Design token mappings

### 4.2 Component-Specific Overrides
- [ ] Identify Ant components needing custom styling
- [ ] Add component-specific theme overrides
- [ ] Test all Ant components in both themes

## Phase 5: Documentation & Governance

### 5.1 Developer Documentation
- [ ] Create `docs/theming/README.md` ✅
- [ ] Document all available tokens
- [ ] Add usage examples
- [ ] Add common patterns
- [ ] Add decision tree
- [ ] Add testing guide
- [ ] Review with team

### 5.2 Visual Regression Testing
- [ ] Set up Playwright or Chromatic
- [ ] Create test suite for theme switching
- [ ] Add tests for all major pages
- [ ] Add tests for all major components
- [ ] Integrate into CI/CD
- [ ] Document testing process

### 5.3 Governance
- [ ] Add theming section to contribution guide
- [ ] Add PR checklist item for theme testing
- [ ] Add code review guidelines for tokens
- [ ] Schedule team training session

## Phase 6: Rollout & Monitoring

### 6.1 Feature Flag
- [ ] Add `THEME_SWITCHING` feature flag
- [ ] Hide toggle behind flag initially
- [ ] Test with flag enabled/disabled

### 6.2 Gradual Rollout
- [ ] Enable for internal testing
- [ ] Gather feedback from team
- [ ] Fix any issues found
- [ ] Beta release to opt-in users
- [ ] Monitor for issues
- [ ] General availability
- [ ] Announce to users

### 6.3 Monitoring
- [ ] Add analytics for theme usage
- [ ] Track theme toggle events
- [ ] Monitor for errors
- [ ] Gather user feedback
- [ ] Create dashboard for theme metrics

## Final Checklist

- [ ] All components migrated to tokens
- [ ] No hardcoded colors remain (audit passes)
- [ ] All tests passing
- [ ] Visual regression tests passing
- [ ] Documentation complete
- [ ] Team trained
- [ ] Feature released
- [ ] Monitoring in place
- [ ] User feedback collected
- [ ] Post-mortem completed

## Success Metrics

- [ ] 100% of components use design tokens
- [ ] 0 hardcoded colors in CSS files
- [ ] Theme toggle works in all browsers
- [ ] No visual regressions
- [ ] Positive user feedback
- [ ] Team adoption of token system

## Notes

Use this space to track blockers, decisions, and important notes during implementation.

---

**Started:** [Date]  
**Completed:** [Date]  
**Team Members:** [Names]

