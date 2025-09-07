.PHONY: changelog
changelog:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/notes.py -O ./scripts/release-notes.py -q
	chmod 755 ./scripts/release-notes.py
	./scripts/release-notes.py --exclude-dependabot --repo jaeger-ui --verbose

.PHONY: prepare-release
prepare-release:
	@echo "Starting automated release preparation..."
	@echo "Usage: make prepare-release VERSION=x.y.z"
	@echo "Example: make prepare-release VERSION=1.74.0"
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required"; \
		echo "Usage: make prepare-release VERSION=x.y.z"; \
		exit 1; \
	fi
	@node scripts/release/prepare.js $(VERSION)

.PHONY: draft-release
draft-release:
	wget https://raw.githubusercontent.com/jaegertracing/jaeger/main/scripts/release/draft.py -O ./scripts/draft-release.py -q
	chmod 755 ./scripts/draft-release.py
	./scripts/draft-release.py --title "Jaeger UI" --repo jaeger-ui
