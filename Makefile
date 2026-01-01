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

.PHONY: release
release:
	@test $(VERSION) || (echo "VERSION is not set. Use 'make release VERSION=vX.Y.Z'"; exit 1)
	python3 scripts/prepare-release.py --version $(VERSION)
