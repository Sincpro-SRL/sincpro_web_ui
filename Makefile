.DEFAULT_GOAL := help

PACKAGE := @sincpro/web-ui

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  init            install pre-commit + dependencies"
	@echo "  format          eslint --fix + prettier, then typecheck"
	@echo "  lint            eslint"
	@echo "  typecheck       tsc --noEmit"
	@echo "  doctor          the traps tsc does not catch"
	@echo "  test            vitest: logic in Node + every story in Chrome (light, then dark)"
	@echo "  verify-format   format + lint + doctor, then fail if the tree is dirty (CI)"
	@echo "  build           compile into dist/"
	@echo "  dev             Storybook on :6006 (with its MCP server at /mcp)"
	@echo "  storybook       static Storybook into storybook-static/"
	@echo "  smoke           only the stories (their play, a11y, screen rules), light and dark"
	@echo "  update-version  VERSION=x.y.z — release pipeline only, never by hand"
	@echo "  publish         build + publish to NPM (release pipeline)"
	@echo "  clean           remove dist/ and node_modules/"

prepare-environment:
	@pipx install pre-commit
	@pipx ensurepath
	@pre-commit install

init: prepare-environment
	@echo "Installing Node.js dependencies..."
	@yarn install

typecheck:
	@npx tsc --noEmit

format:
	@echo "🔤 Sorting imports + auto-fix (eslint)..."
	@npx eslint . --fix
	@echo "🎨 Formatting (prettier)..."
	@npx prettier --experimental-cli --write "**/*.{ts,tsx,css,json,md}" ".github/**/*.{yaml,yml}" --ignore-path .prettierignore --ignore-unknown
	@echo "Checking types after formatting..."
	@$(MAKE) typecheck

lint:
	@npx eslint .

# The traps `tsc` does not catch. Comment lines are skipped: an example inside a docstring is
# documentation, not an import.
SCAN := grep -rnE --include=*.ts --include=*.tsx
NOT_COMMENT := grep -vE ':[0-9]+: *(\*|//|/\*)'

doctor:
	@echo "🩺 Checking the traps..."
	@found=0; \
	if $(SCAN) 'from "\.' src | $(NOT_COMMENT); then \
		echo >&2 "✘ relative import — the source imports itself as $(PACKAGE)"; found=1; \
	fi; \
	if $(SCAN) 'from "[^"]+\.tsx?"' src | $(NOT_COMMENT); then \
		echo >&2 "✘ .ts/.tsx extension in an import — the build emits it as-is and breaks"; found=1; \
	fi; \
	if $(SCAN) 'from "$(PACKAGE)/(primitives|components|views)/' src/foundations | $(NOT_COMMENT); then \
		echo >&2 "✘ foundations importing a level above — foundations import nothing but foundations"; found=1; \
	fi; \
	if $(SCAN) 'from "$(PACKAGE)/(components|views)/' src/primitives | $(NOT_COMMENT); then \
		echo >&2 "✘ a primitive importing a component or a view — a primitive knows no screen"; found=1; \
	fi; \
	if $(SCAN) 'from "$(PACKAGE)/views/' src/components | $(NOT_COMMENT); then \
		echo >&2 "✘ a component importing a view — move what both need down into components/"; found=1; \
	fi; \
	if [ "$$found" = "1" ]; then exit 1; fi; \
	echo "✓ no traps found"

# One runner, three projects (vitest.config.ts): `model` in Node, `storybook` and
# `storybook-dark` in a real Chrome — the stories ARE the tests, and Storybook's «Run tests»
# runs these same ones. The same scheme as web-composer and web-framework.
test:
	@echo "🧪 Running tests..."
	@VITE_CONFIG_NATIVE_IGNORE_WARNING=true npx vitest run

verify-format: format lint doctor
	@if ! git diff --quiet; then \
	  echo >&2 "✘ Formatting changed files. Please add them to the commit."; \
	  git --no-pager diff --name-only HEAD -- >&2; \
	  exit 1; \
	fi
	@echo "✓ Format verification passed"

# tsc emits only JS + .d.ts; the stylesheets (tokens, …) are copied next to them with the
# same layout, so `@sincpro/web-ui/<path>.css` resolves to the same file it did in src/.
build:
	@echo "🏗️  Building $(PACKAGE) -> dist (tsc)..."
	@rm -rf dist
	@npx tsc -p tsconfig.build.json
	@npx tsc-alias -p tsconfig.build.json
	@node -e "const fs = require('node:fs'); fs.cpSync('src', 'dist', { recursive: true, filter: (p) => fs.statSync(p).isDirectory() || p.endsWith('.css') });"
	@echo "✓ Build ready in ./dist (JS + .d.ts + .css, @sincpro/web-ui resolved to relative)"

dev:
	@npx storybook dev -p 6006 --no-open

storybook:
	@npx storybook build -o storybook-static

# Only the stories: each one in Chrome with its `play`, its a11y check and the screen rules
# (drew something, one primary); the screens again in dark.
smoke:
	@VITE_CONFIG_NATIVE_IGNORE_WARNING=true npx vitest run --project storybook --project storybook-dark

# `--package-lock=false`: npm (unlike yarn, which manages this repo's installs) doesn't read
# yarn.lock, so without it `npm version` rebuilds a dependency tree against the real registry
# and writes a package-lock.json this repo doesn't keep.
update-version:
ifndef VERSION
	$(error VERSION is required. Usage: make update-version VERSION=1.2.3)
endif
	@CURRENT_VERSION=$$(node -p "require('./package.json').version"); \
	if [ "$$CURRENT_VERSION" = "$(VERSION)" ]; then \
		echo "✓ Version is already $(VERSION), skipping update"; \
	else \
		npm version $(VERSION) --no-git-tag-version --package-lock=false && \
			echo "✓ Version updated to $(VERSION)"; \
	fi

publish: build
	@echo "📦 Publishing $(PACKAGE) to NPM..."
	@if [ -n "$$NPM_TOKEN" ]; then \
		echo "//registry.npmjs.org/:_authToken=$$NPM_TOKEN" > .npmrc.tmp; \
		chmod 600 .npmrc.tmp; \
		npm publish --access public --userconfig .npmrc.tmp; \
		rm -f .npmrc.tmp; \
	else \
		npm publish --access public; \
	fi
	@echo "✓ Published successfully"

deploy:
	@echo "Deploy not applicable for library packages"

clean:
	@rm -rf dist storybook-static node_modules
	@echo "✓ Cleaned"

.PHONY: help prepare-environment init typecheck format lint doctor test verify-format build \
	dev storybook smoke update-version publish deploy clean
