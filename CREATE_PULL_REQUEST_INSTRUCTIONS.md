# How to Create Pull Request for Sparse Trace Visualization

## 🚀 **Step-by-Step Instructions**

### **Prerequisites**
1. You need a GitHub account
2. You need to fork the Jaeger UI repository
3. You need Git configured with your credentials

---

## **Step 1: Fork the Repository**

1. Go to https://github.com/jaegertracing/jaeger-ui
2. Click the **"Fork"** button in the top-right corner
3. This creates a copy of the repository in your GitHub account

---

## **Step 2: Add Your Fork as Remote**

```bash
# Add your fork as a remote (replace YOUR_USERNAME with your GitHub username)
git remote add fork https://github.com/YOUR_USERNAME/jaeger-ui.git

# Verify remotes
git remote -v
```

---

## **Step 3: Create a Feature Branch**

```bash
# Create and switch to a new branch for the sparse trace feature
git checkout -b feature/sparse-trace-visualization

# Verify you're on the new branch
git branch
```

---

## **Step 4: Push Your Changes**

```bash
# Push the feature branch to your fork
git push fork feature/sparse-trace-visualization
```

---

## **Step 5: Create the Pull Request**

### **Option A: Via GitHub Web Interface (Recommended)**

1. Go to your forked repository: `https://github.com/YOUR_USERNAME/jaeger-ui`
2. You should see a banner saying "Compare & pull request" - click it
3. If not, click "Contribute" → "Open pull request"

### **Option B: Direct Link**
Go to: `https://github.com/jaegertracing/jaeger-ui/compare/main...YOUR_USERNAME:jaeger-ui:feature/sparse-trace-visualization`

---

## **Step 6: Fill Out the Pull Request**

### **Title:**
```
feat: Implement sparse trace visualization with compressed gaps (#459)
```

### **Description:**
Copy the content from `PULL_REQUEST_TEMPLATE.md` (created in this directory)

### **Key Sections to Include:**
- Problem statement and solution overview
- Technical implementation details
- Before/after comparison
- Testing results and validation
- Files changed and benefits
- Configuration options

---

## **Step 7: Add Labels and Reviewers**

### **Suggested Labels:**
- `enhancement`
- `frontend`
- `help wanted` (if mentioned in original issue)

### **Reviewers:**
- Tag maintainers mentioned in the original issue
- Look at recent contributors to the TraceTimelineViewer components

---

## **Step 8: Reference the Original Issue**

Make sure your PR description includes:
```
Fixes #459
```

This will automatically link and close the issue when the PR is merged.

---

## **Alternative: Using GitHub CLI**

If you have GitHub CLI installed:

```bash
# Create the pull request directly from command line
gh pr create \
  --title "feat: Implement sparse trace visualization with compressed gaps (#459)" \
  --body-file PULL_REQUEST_TEMPLATE.md \
  --base main \
  --head feature/sparse-trace-visualization
```

---

## **Important Notes**

### **Before Creating the PR:**
1. ✅ All changes are committed
2. ✅ Tests pass locally
3. ✅ Code follows project conventions
4. ✅ Documentation is complete

### **PR Best Practices:**
- **Clear Title**: Descriptive and follows conventional commits
- **Detailed Description**: Explains problem, solution, and impact
- **Screenshots/GIFs**: If possible, show the visual changes
- **Testing Evidence**: Include test results and validation
- **Breaking Changes**: Clearly mark any breaking changes (none in this case)

### **After Creating the PR:**
1. Monitor for feedback from maintainers
2. Be responsive to review comments
3. Make requested changes promptly
4. Keep the PR updated with main branch if needed

---

## **Expected Timeline**

- **Initial Review**: 1-3 days (depending on maintainer availability)
- **Feedback Cycle**: 1-2 rounds of review/changes
- **Merge Timeline**: 1-2 weeks (for significant features like this)

---

## **Troubleshooting**

### **If Push Fails:**
```bash
# Make sure you're pushing to your fork, not the original repo
git remote -v
git push fork feature/sparse-trace-visualization
```

### **If Branch Conflicts:**
```bash
# Update your main branch
git checkout main
git pull origin main

# Rebase your feature branch
git checkout feature/sparse-trace-visualization
git rebase main
```

### **If Tests Fail:**
```bash
# Run the validation script
node test-sparse-trace.js

# Run specific tests
npm test -- --testPathPattern=utils.test.js
```

---

## **Success Criteria**

Your PR will be ready when:
- ✅ All automated checks pass
- ✅ Code review feedback is addressed
- ✅ Documentation is complete
- ✅ Tests demonstrate functionality
- ✅ No breaking changes introduced
- ✅ Performance impact is minimal

---

## **Contact Information**

If you need help with the PR process:
1. Check the Jaeger project's contributing guidelines
2. Ask questions in the GitHub issue #459
3. Reach out to maintainers mentioned in recent commits

**Good luck with your pull request! This is a significant contribution that will help many users with sparse trace analysis.** 🎉
