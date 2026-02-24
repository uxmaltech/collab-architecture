SHELL := /bin/sh

# Load .env if it exists (does not fail if missing).
# Variables defined here act as fallbacks — .env values take priority.
-include .env
export

# ── Qdrant ──────────────────────────────────────────
QDRANT_CONTAINER  ?= collab-qdrant
QDRANT_IMAGE      ?= qdrant/qdrant:v1.8.1
QDRANT_PORT       ?= 6333
QDRANT_GRPC_PORT  ?= 6334
QDRANT_URL        ?= http://localhost:6333
QDRANT_COLLECTION ?= collab-architecture-canon
QDRANT_VECTOR_SIZE ?= 1536
QDRANT_DISTANCE   ?= Cosine
QDRANT_BATCH_SIZE ?= 64
ARCH_COLLECTION   ?= $(QDRANT_COLLECTION)
BUSINESS_COLLECTION ?= business-architecture-canon

# ── NebulaGraph ─────────────────────────────────────
NEBULA_COMPOSE    ?= infra/nebula-compose.yaml
NEBULA_VERSION    ?= v3.6.0
NEBULA_PROJECT    ?= $(notdir $(CURDIR))
NEBULA_NETWORK    ?= $(NEBULA_PROJECT)_default
NEBULA_CONSOLE_IMAGE ?= vesoft/nebula-console:$(NEBULA_VERSION)
NEBULA_GRAPH_CONTAINER ?= nebula-graphd
NEBULA_ADDR       ?= graphd
NEBULA_STORAGE_HOST ?= storaged0
NEBULA_STORAGE_PORT ?= 9779
NEBULA_PORT       ?= 9669
NEBULA_USER       ?= root
NEBULA_PASSWORD   ?= nebula
NEBULA_SPACE      ?= collab_architecture
ARCH_SPACE        ?= $(NEBULA_SPACE)
BUSINESS_SPACE    ?= business_architecture

# ── MCP Server ──────────────────────────────────────
# MCP_ENV must come from .env — no default here so missing = auth required
MCP_HOST          ?= 127.0.0.1
MCP_PORT          ?= 7337
MCP_API_KEYS      ?=

.PHONY: db-up db-down qdrant-up qdrant-down nebula-up nebula-down wait-qdrant wait-nebula nebula-add-hosts seed update seed-embeddings seed-graph update-graph reset reset-graph reset-embeddings tools-up tools-dev tools-down tools-status tools-config ingest-v2 ingest-github update-github status logs-qdrant logs-nebula

status:
	@echo "Qdrant container: $(QDRANT_CONTAINER)"
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed 1d | grep -E '^$(QDRANT_CONTAINER)\b' || true
	@echo "NebulaGraph containers:"
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed 1d | grep -E '^nebula-' || true

qdrant-up:
	@docker inspect $(QDRANT_CONTAINER) >/dev/null 2>&1 && echo "Qdrant already exists" || \
		docker run -d --name $(QDRANT_CONTAINER) \
		-p $(QDRANT_PORT):6333 \
		-p $(QDRANT_GRPC_PORT):6334 \
		-v $(QDRANT_CONTAINER)-data:/qdrant/storage \
		$(QDRANT_IMAGE)

qdrant-down:
	@docker rm -f $(QDRANT_CONTAINER) >/dev/null 2>&1 || true

nebula-up:
	@NEBULA_VERSION=$(NEBULA_VERSION) docker compose -p $(NEBULA_PROJECT) -f $(NEBULA_COMPOSE) up -d

nebula-down:
	@NEBULA_VERSION=$(NEBULA_VERSION) docker compose -p $(NEBULA_PROJECT) -f $(NEBULA_COMPOSE) down -v

wait-qdrant:
	@CURL_OPTS=""; \
	if [ -n "$(QDRANT_API_KEY)" ]; then CURL_OPTS="-H 'api-key: $(QDRANT_API_KEY)'"; fi; \
	i=0; \
	until eval curl -sf $$CURL_OPTS $(QDRANT_URL)/collections >/dev/null 2>&1; do \
		i=$$((i+1)); \
		if [ $$i -ge 30 ]; then echo "Qdrant not ready"; exit 1; fi; \
		sleep 1; \
	done; \
	echo "Qdrant ready"

wait-nebula:
	@if [ "$(EXTERNAL_SERVICES)" = "true" ]; then \
		echo "Waiting for NebulaGraph on $(NEBULA_ADDR):$(NEBULA_PORT)"; \
		i=0; \
		until nc -z $(NEBULA_ADDR) $(NEBULA_PORT) 2>/dev/null; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "NebulaGraph not ready"; exit 1; fi; \
			sleep 2; \
		done; \
		echo "NebulaGraph ready"; \
	else \
		net=$$(docker inspect -f '{{range $$k, $$v := .NetworkSettings.Networks}}{{$$k}}{{end}}' $(NEBULA_GRAPH_CONTAINER) 2>/dev/null); \
		if [ -z "$$net" ]; then net="$(NEBULA_NETWORK)"; fi; \
		echo "Waiting for NebulaGraph on $(NEBULA_ADDR):$(NEBULA_PORT) via $$net"; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW SPACES' >/dev/null 2>&1; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "NebulaGraph not ready"; exit 1; fi; \
			sleep 2; \
		done; \
		echo "NebulaGraph ready"; \
	fi

seed-embeddings: wait-qdrant
	@python3 embeddings/ingest/ingest_embeddings.py
	@QDRANT_URL=$(QDRANT_URL) \
		QDRANT_COLLECTION=$(QDRANT_COLLECTION) \
		QDRANT_VECTOR_SIZE=$(QDRANT_VECTOR_SIZE) \
		QDRANT_DISTANCE=$(QDRANT_DISTANCE) \
		QDRANT_BATCH_SIZE=$(QDRANT_BATCH_SIZE) \
		python3 embeddings/ingest/seed_qdrant.py

seed-graph:
	@if [ "$(EXTERNAL_SERVICES)" = "true" ]; then \
		node --env-file=.env scripts/seed-graph.mjs; \
	else \
		$(MAKE) wait-nebula; \
		net=$$(docker inspect -f '{{range $$k, $$v := .NetworkSettings.Networks}}{{$$k}}{{end}}' $(NEBULA_GRAPH_CONTAINER) 2>/dev/null); \
		if [ -z "$$net" ]; then net="$(NEBULA_NETWORK)"; fi; \
		hosts=$$(docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW HOSTS' 2>/dev/null); \
		echo "$$hosts" | grep -q "$(NEBULA_STORAGE_HOST)" || \
			docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
				-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
				-e 'ADD HOSTS "$(NEBULA_STORAGE_HOST)":$(NEBULA_STORAGE_PORT);'; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW HOSTS' 2>/dev/null | grep -q "\"$(NEBULA_STORAGE_HOST)\"" && \
		      docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW HOSTS' 2>/dev/null | grep -q 'ONLINE'; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Storaged host not ONLINE"; exit 1; fi; \
			sleep 2; \
		done; \
		docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'CREATE SPACE IF NOT EXISTS collab_architecture(vid_type=FIXED_STRING(32), partition_num=1, replica_factor=1);'; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW SPACES' 2>/dev/null | grep -q collab_architecture; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Space collab_architecture not ready"; exit 1; fi; \
			sleep 2; \
		done; \
		i=0; \
		while docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'USE collab_architecture; SHOW TAGS' 2>/dev/null | grep -q 'SpaceNotFound'; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Space collab_architecture not ready for USE"; exit 1; fi; \
			sleep 2; \
		done; \
		docker run --rm --network $$net \
			-v $(CURDIR)/graph/seed:/seed:ro \
			$(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-f /seed/schema.ngql; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'USE collab_architecture; DESCRIBE TAG Node;' 2>/dev/null | grep -q node_type; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Schema not ready"; exit 1; fi; \
			sleep 2; \
		done; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'USE collab_architecture; INSERT VERTEX Node(node_type, name) VALUES "SCHEMA-CHECK":("SchemaCheck","SchemaCheck");' 2>/dev/null \
			| grep -q 'Execution succeeded'; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Schema insert check failed"; exit 1; fi; \
			sleep 2; \
		done; \
		docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'USE collab_architecture; DELETE VERTEX "SCHEMA-CHECK";' >/dev/null 2>&1 || true; \
		out=$$(docker run --rm --network $$net \
			-v $(CURDIR)/graph/seed:/seed:ro \
			$(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-f /seed/data.ngql); \
		echo "$$out"; \
		echo "$$out" | grep -Fq '[ERROR' && exit 1 || true; \
	fi

seed:
	@[ "$(EXTERNAL_SERVICES)" = "true" ] || $(MAKE) db-up
	@$(MAKE) seed-embeddings seed-graph

reset-embeddings: wait-qdrant
	@echo "Resetting Qdrant collection: $(QDRANT_COLLECTION)"
	@CURL_OPTS=""; \
	if [ -n "$(QDRANT_API_KEY)" ]; then CURL_OPTS="-H 'api-key: $(QDRANT_API_KEY)'"; fi; \
	eval curl -sf -X DELETE $$CURL_OPTS $(QDRANT_URL)/collections/$(QDRANT_COLLECTION) >/dev/null 2>&1 || true; \
	echo "Collection $(QDRANT_COLLECTION) deleted (or did not exist)"

reset-graph:
	@if [ "$(EXTERNAL_SERVICES)" = "true" ]; then \
		node --env-file=.env scripts/reset-graph.mjs; \
	else \
		$(MAKE) wait-nebula; \
		net=$$(docker inspect -f '{{range $$k, $$v := .NetworkSettings.Networks}}{{$$k}}{{end}}' $(NEBULA_GRAPH_CONTAINER) 2>/dev/null); \
		if [ -z "$$net" ]; then net="$(NEBULA_NETWORK)"; fi; \
		docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'DROP SPACE IF EXISTS $(NEBULA_SPACE);'; \
		echo "Space $(NEBULA_SPACE) dropped"; \
	fi

reset: reset-embeddings reset-graph

update-graph: wait-nebula
	@net=$$(docker inspect -f '{{range $$k, $$v := .NetworkSettings.Networks}}{{$$k}}{{end}}' $(NEBULA_GRAPH_CONTAINER) 2>/dev/null); \
	if [ -z "$$net" ]; then net="$(NEBULA_NETWORK)"; fi; \
	echo "Updating NebulaGraph on $(NEBULA_ADDR):$(NEBULA_PORT) via $$net"; \
	i=0; \
	until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
		-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
		-e 'SHOW SPACES' >/dev/null 2>&1; do \
		i=$$((i+1)); \
		if [ $$i -ge 30 ]; then echo "NebulaGraph not ready"; exit 1; fi; \
		sleep 2; \
	done; \
		docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'CREATE SPACE IF NOT EXISTS $(ARCH_SPACE)(vid_type=FIXED_STRING(32), partition_num=1, replica_factor=1);'; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'SHOW SPACES' 2>/dev/null | grep -q $(ARCH_SPACE); do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Space $(ARCH_SPACE) not ready"; exit 1; fi; \
			sleep 2; \
		done; \
		i=0; \
		until docker run --rm --network $$net $(NEBULA_CONSOLE_IMAGE) \
			-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
			-e 'USE $(ARCH_SPACE); DESCRIBE TAG Node;' 2>/dev/null | grep -q node_type; do \
			i=$$((i+1)); \
			if [ $$i -ge 30 ]; then echo "Schema not ready; run make seed for bootstrap"; exit 1; fi; \
			sleep 2; \
		done; \
	data_tmp=$$(mktemp); \
	sed "s/USE collab_architecture;/USE $(ARCH_SPACE);/g" $(CURDIR)/graph/seed/data.ngql > $$data_tmp; \
	out=$$(docker run --rm --network $$net \
		-v $$data_tmp:/seed/data.override.ngql:ro \
		$(NEBULA_CONSOLE_IMAGE) \
		-u $(NEBULA_USER) -p $(NEBULA_PASSWORD) -addr $(NEBULA_ADDR) -port $(NEBULA_PORT) \
		-f /seed/data.override.ngql); \
	rm -f $$data_tmp; \
	echo "$$out"; \
	echo "$$out" | grep -Fq '[ERROR' && exit 1 || true

update: seed-embeddings update-graph

tools-up:
	@[ "$(EXTERNAL_SERVICES)" = "true" ] || $(MAKE) db-up
	@$(MAKE) -C tools/mcp-collab up

tools-dev:
	@[ "$(EXTERNAL_SERVICES)" = "true" ] || $(MAKE) db-up
	@$(MAKE) -C tools/mcp-collab dev

tools-down:
	@$(MAKE) -C tools/mcp-collab down

tools-status:
	@$(MAKE) -C tools/mcp-collab status

tools-config:
	@scripts/tools-config.sh

ingest-v2:
	@[ "$(EXTERNAL_SERVICES)" = "true" ] || $(MAKE) db-up
	@$(MAKE) wait-qdrant
	@$(MAKE) -C tools/mcp-collab ingest-v2 BUSINESS_FILE="$(BUSINESS_FILE)"

ingest-github:
	@[ "$(EXTERNAL_SERVICES)" = "true" ] || $(MAKE) db-up
	@$(MAKE) wait-qdrant
	@$(MAKE) -C tools/mcp-collab ingest-github \
		REPOS="$(REPOS)" \
		CONTEXT="$(CONTEXT)" \
		SCOPE="$(SCOPE)" \
		MODE="$(MODE)" \
		BRANCH="$(BRANCH)" \
		INCLUDE_EXT="$(INCLUDE_EXT)" \
		FROM_SHA="$(FROM_SHA)" \
		DRY_RUN="$(DRY_RUN)" \
		DEBUG="$(DEBUG)" \
		SKIP_EMBED_CONFIRM="$(SKIP_EMBED_CONFIRM)" \
		NO_PROGRESS="$(NO_PROGRESS)"

update-github:
	@$(MAKE) ingest-github \
		REPOS="$(REPOS)" \
		CONTEXT="$(CONTEXT)" \
		SCOPE="$(SCOPE)" \
		MODE=delta \
		BRANCH="$(BRANCH)" \
		INCLUDE_EXT="$(INCLUDE_EXT)" \
		FROM_SHA="$(FROM_SHA)" \
		DRY_RUN="$(DRY_RUN)" \
		DEBUG="$(DEBUG)" \
		SKIP_EMBED_CONFIRM="$(SKIP_EMBED_CONFIRM)" \
		NO_PROGRESS="$(NO_PROGRESS)"

db-up: qdrant-up nebula-up

db-down: qdrant-down nebula-down

logs-qdrant:
	@docker logs -f $(QDRANT_CONTAINER)

logs-nebula:
	@docker logs -f $(NEBULA_GRAPH_CONTAINER)
