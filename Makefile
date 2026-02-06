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

.PHONY: check-env
check-env:
	@NODE_VERSION=$$(node -v | cut -d 'v' -f 2); \
	NVMRC_VERSION=$$(cat .nvmrc | tr -d '[:space:]'); \
	if [ "$$NODE_VERSION" != "$$NVMRC_VERSION" ] && [ "$${NODE_VERSION%%.*}" != "$$NVMRC_VERSION" ]; then \
		echo "Error: Node.js version mismatch."; \
		echo "Current: v$$NODE_VERSION, Required (from .nvmrc): v$$NVMRC_VERSION"; \
		echo "Please run 'nvm use'"; \
		exit 1; \
	fi
	@if [ ! -d "node_modules" ]; then \
		echo "Error: node_modules directory not found."; \
		echo "Please run 'npm ci'"; \
		exit 1; \
	fi

.PHONY: prepare-release
prepare-release: check-env
	@test $(VERSION) || (echo "VERSION is not set. Use 'make prepare-release VERSION=vX.Y.Z'"; exit 1)
	python3 scripts/prepare-release.py --version $(VERSION)

.PHONY: fmt
fmt:
	npm run prettier

.PHONY: lint
lint:
	npm run lint

.PHONY: test
test:
	npm run test
