# Cutting a Jaeger UI release

<!-- BEGIN_CHECKLIST -->

1. Prepare the release.
   - Go to `jaeger-ui` repository root directory, `main` branch.
   - Run `git status && git pull` to ensure the working directory is clean.
   - Run `make prepare-release VERSION=vX.Y.Z ISSUE=__RELEASE_ISSUE__`.
   - This command will:
     - Verify the version format.
     - Create a branch `release-vX.Y.Z`.
     - Generate release notes and update `CHANGELOG.md`.
     - Update `packages/jaeger-ui/package.json`.
     - creating a PR with `changelog:skip` label and title "Prepare release vX.Y.Z".
   - **Review the PR**:
     - Check `CHANGELOG.md` content.
     - Verify `package.json` version.
     - Merge the PR once approved.

2. Create a GitHub release.
   - After the PR is merged, the [Draft release](https://github.com/jaegertracing/jaeger-ui/actions/workflows/release-draft.yml) workflow creates a draft release from the merge commit.
     - If no draft appears, run `make draft-release TARGET=<merge commit SHA>` (requires [gh](https://cli.github.com/manual/installation)).
     - Open the draft on [GitHub Releases](https://github.com/jaegertracing/jaeger-ui/releases) and hit the Edit button.
     - Review the release notes and edit them if needed.
     - Publish the release.
     - Wait for the [Publish release](https://github.com/jaegertracing/jaeger-ui/actions/workflows/release.yml) workflow to finish. It will generate release artifacts whi will be used by the main repository for the new UI.

<!-- END_CHECKLIST -->

## Manual release

   - Manual:
     - The tag and release must refer to the commit created when the PR from the previous step was merged.
     - The tag name for the GitHub release should be the version for the release. It should include the "v", e.g. `v1.0.0`.
     - The title of the release match the format "Jaeger UI vX.Y.Z".
     - Copy the new CHANGELOG.md section into the release notes.
