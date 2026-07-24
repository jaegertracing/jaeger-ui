.PHONY: changelog
changelog:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/notes.py -O ./scripts/release-notes.py -q
	chmod 755 ./scripts/release-notes.py
	./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui --verbose

.PHONY: draft-release
draft-release:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/draft.py -O ./scripts/draft-release.py -q
	chmod 755 ./scripts/draft-release.py
	./scripts/draft-release.py --title "Jaeger UI" --repo jaeger-ui

.PHONY: prepare-release
prepare-release:
	@test $(VERSION) || (echo "VERSION is not set. Use 'make prepare-release VERSION=vX.Y.Z [ISSUE=nnnn]'"; exit 1)
	python3 scripts/prepare-release.py --version $(VERSION) $(if $(ISSUE),--issue $(ISSUE))

.PHONY: bundle-stats
bundle-stats:
	BUNDLE_STATS=1 pnpm run build
	@echo "Bundle stats written to packages/jaeger-ui/build/bundle-stats.csv"

.PHONY: reinstall
reinstall:
	rm -rf node_modules packages/jaeger-ui/node_modules packages/plexus/node_modules
	pnpm install --frozen-lockfile

.PHONY: start
start:
	pnpm start

.PHONY: fmt
fmt:
	pnpm run fmt

.PHONY: lint
lint:
	pnpm run lint

.PHONY: test
test:
	pnpm run test

.PHONY: build
build:
	pnpm run build

.PHONY: coverage
coverage:
	pnpm run coverage

.PHONY: depcheck
depcheck:
	pnpm run depcheck

.PHONY: ci
ci:
	pnpm install --frozen-lockfile
