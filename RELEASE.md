# Cutting a Jaeger UI release

<!-- BEGIN_CHECKLIST -->

1. Prepare the release.
   - Go to `jaeger-ui` repository root directory, `main` branch.
   - Run `git status && git pull` to ensure the working directory is clean.
   - Run `make prepare-release VERSION=vX.Y.Z`.
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
   - Run `make draft-release` (requires [gh](https://cli.github.com/manual/installation))
     - It will create a draft release with the release notes.
     - Open the printed URL and hit the Edit button on the draft release.
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
