.PHONY: draft-release
draft-release:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/draft.py -O ./scripts/draft-release.py -q
	chmod 755 ./scripts/draft-release.py
	./scripts/draft-release.py --title "Jaeger UI" --repo jaeger-ui

.PHONY: prepare-release
prepare-release:
	@test $(VERSION) || (echo "VERSION is not set. Use 'make prepare-release VERSION=vX.Y.Z'"; exit 1)
	python3 scripts/prepare-release.py --version $(VERSION)

.PHONY: bundle-stats
bundle-stats:
	BUNDLE_STATS=1 npm run build
	@echo "Bundle stats written to packages/jaeger-ui/build/bundle-stats.csv"

.PHONY: reinstall
reinstall:
	rm -rf node_modules packages/jaeger-ui/node_modules packages/plexus/node_modules
	npm ci

.PHONY: fmt
fmt:
	npm run fmt

.PHONY: lint
lint:
	npm run lint

.PHONY: test
test:
	npm run test
