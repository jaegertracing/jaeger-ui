# Cutting a Jaeger UI release

<!-- BEGIN_CHECKLIST -->

1. Prepare the release.
   - Go to `jaeger-ui` repository root directory, `main` branch.
   - Run `git status && git pull` to ensure the working directory is clean.
   - Run `make prepare-release VERSION=vX.Y.Z ISSUE=__RELEASE_ISSUE__`.
   - This command will:
     - Verify the version format.
     - Create a branch `release-vX.Y.Z-<unix time>`.
     - Generate release notes and update `CHANGELOG.md`.
     - Update `packages/jaeger-ui/package.json`.
     - creating a PR with `changelog:skip` label and title "Prepare release vX.Y.Z".
   - **Review the PR**:
     - Check `CHANGELOG.md` content.
     - Verify `package.json` version.
     - Once another maintainer approves the PR and the required checks pass, merge it if it is still open. The approver may have merged it already; this prints the state and, once merged, the merge commit SHA. Note the SHA for the next step.
       ```bash
       gh pr view <PR number> -R jaegertracing/jaeger-ui --json state,mergeCommit --jq '[.state, .mergeCommit.oid] | @tsv'
       ```
     - Check that the merge commit's subject starts with `Prepare release v`. If it does not, the Draft release workflow in the next step does not run.
       ```bash
       gh api repos/jaegertracing/jaeger-ui/commits/<merge commit SHA> --jq '.commit.message | split("\n")[0]'
       ```

2. Create a GitHub release.
   - After the PR is merged, the [Draft release](https://github.com/jaegertracing/jaeger-ui/actions/workflows/release-draft.yml) workflow creates a draft release from the merge commit.
     - If no draft appears, run `make draft-release TARGET=<merge commit SHA>` (requires [gh](https://cli.github.com/manual/installation)).
     - Review the draft's release notes with `gh release view vX.Y.Z -R jaegertracing/jaeger-ui`, then publish it with `gh release edit vX.Y.Z -R jaegertracing/jaeger-ui --draft=false`. To fix the notes first, or to do this in the browser, open the draft on [GitHub Releases](https://github.com/jaegertracing/jaeger-ui/releases), click Edit, change the notes, and click Publish release.
     - Wait for the [Publish release](https://github.com/jaegertracing/jaeger-ui/actions/workflows/release.yml) workflow to finish. It will generate release artifacts whi will be used by the main repository for the new UI.

<!-- END_CHECKLIST -->

## Manual release

   - Manual:
     - The tag and release must refer to the commit created when the PR from the previous step was merged.
     - The tag name for the GitHub release should be the version for the release. It should include the "v", e.g. `v1.0.0`.
     - The title of the release match the format "Jaeger UI vX.Y.Z".
     - Copy the new CHANGELOG.md section into the release notes.
