# SolversHub — monorepo
#
# Orquesta los componentes del producto. Hoy viven aquí: `apps/panel-web` y
# `brand/` (tokens). agent-core (servicio Python) y solvershub-apk siguen en sus
# repos por ahora; se referencian por ruta relativa (AGENT_CORE).
#
# Ver README.md § Software para el mapa completo.

AGENT_CORE ?= ../solvershub-backend
AGENT_PY := $(AGENT_CORE)/.venv/bin/python
PANEL ?= apps/panel-web
PANEL_PORT ?= 3200

.PHONY: help tokens tokens-sync api-contract api-types panel-install panel-dev \
        panel-build panel-check core-rebuild core-lint core-test lint test

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## --- Marca / tokens ---
tokens: ## Genera tokens (CSS · Tailwind · RN · Android) desde tokens.json
	cd brand/tokens && npm run build

tokens-sync: tokens ## Regenera tokens y los copia al panel
	cd $(PANEL) && npm run tokens:sync

## --- Contrato API / tipos ---
api-contract: ## Exporta el OpenAPI de agent-core a docs/openapi.json
	$(AGENT_PY) $(AGENT_CORE)/scripts/export_openapi.py

api-types: api-contract ## Regenera el contrato y los tipos TS del panel
	cd $(PANEL) && OPENAPI_PATH=$(abspath $(AGENT_CORE))/docs/openapi.json npm run api:types

## --- Panel web ---
panel-install: ## Instala dependencias del panel
	cd $(PANEL) && npm install

panel-dev: ## Levanta el panel en :3200 (PANEL_PORT configurable)
	cd $(PANEL) && PORT=$(PANEL_PORT) npm run dev

panel-build: ## Build de producción del panel
	cd $(PANEL) && npm run build

panel-check: ## typecheck + lint + build del panel
	cd $(PANEL) && npm run typecheck && npm run lint && npm run build

## --- agent-core (servicio) ---
core-rebuild: ## Reconstruye y reinicia core-api del stack (docker compose)
	cd $(AGENT_CORE) && docker compose up -d --build core-api

core-lint: ## ruff de agent-core
	cd $(AGENT_CORE) && ./.venv/bin/python -m ruff check core cli tests evals scripts

core-test: ## pytest de agent-core (unitarios, sin BD)
	cd $(AGENT_CORE) && ./.venv/bin/python -m pytest -q

## --- Todo ---
lint: core-lint ## Lint de todo el monorepo
	cd $(PANEL) && npm run lint

test: ## Tests + typecheck de todo el monorepo
	cd $(AGENT_CORE) && ./.venv/bin/python -m pytest -q
	cd $(PANEL) && npm run typecheck
