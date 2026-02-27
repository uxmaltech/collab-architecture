SHELL := /bin/sh

# Load .env from project root (does not fail if missing).
# When invoked via the root Makefile, variables arrive via `export`.
-include ../../.env

# Local-only defaults (not in .env)
MCP_PID_FILE ?= .pid
MCP_LOG_FILE ?= mcp.log

.PHONY: up down dev status install ingest-v2 ingest-github

install:
	@[ -d node_modules ] || npm install

up: install
	@if [ -f $(MCP_PID_FILE) ] && kill -0 "$$(cat $(MCP_PID_FILE))" 2>/dev/null; then \
		echo "MCP server already running (PID $$(cat $(MCP_PID_FILE)))"; \
	else \
		node $$([ -f ../../.env ] && echo '--env-file=../../.env') server.mjs > $(MCP_LOG_FILE) 2>&1 & \
		echo $$! > $(MCP_PID_FILE); \
		pid=$$(cat $(MCP_PID_FILE)); \
		sleep 2; \
		if kill -0 $$pid 2>/dev/null; then \
			echo "MCP server started on http://$${MCP_HOST:-127.0.0.1}:$${MCP_PORT:-7337}/mcp (PID $$pid)"; \
		else \
			echo "❌ Failed to start MCP server"; \
			echo ""; \
			echo "Last 20 lines of $(MCP_LOG_FILE):"; \
			echo "─────────────────────────────────────────"; \
			tail -n 20 $(MCP_LOG_FILE); \
			echo "─────────────────────────────────────────"; \
			echo "Full log: cat tools/mcp-collab/$(MCP_LOG_FILE)"; \
			rm -f $(MCP_PID_FILE); \
			exit 1; \
		fi; \
	fi

dev: install
	@echo "MCP server (watch mode) on http://$${MCP_HOST:-127.0.0.1}:$${MCP_PORT:-7337}/mcp"
	@node --watch $$([ -f ../../.env ] && echo '--env-file=../../.env') server.mjs

down:
	@if [ -f $(MCP_PID_FILE) ]; then \
		pid=$$(cat $(MCP_PID_FILE)); \
		if kill -0 $$pid 2>/dev/null; then \
			kill $$pid; \
			echo "Stopped MCP server (PID $$pid)"; \
		else \
			echo "MCP server not running (stale PID $$pid)"; \
		fi; \
		rm -f $(MCP_PID_FILE); \
	else \
		echo "MCP server not running"; \
	fi

status:
	@if [ -f $(MCP_PID_FILE) ] && kill -0 "$$(cat $(MCP_PID_FILE))" 2>/dev/null; then \
		echo "MCP server running (PID $$(cat $(MCP_PID_FILE))) on http://$${MCP_HOST:-127.0.0.1}:$${MCP_PORT:-7337}/mcp"; \
	else \
		echo "MCP server not running"; \
	fi

ingest-v2: install
	@if [ -n "$(BUSINESS_FILE)" ]; then \
		npm run ingest:v2 -- --business-file "$(BUSINESS_FILE)"; \
	else \
		npm run ingest:v2; \
	fi

ingest-github: install
	@if [ -z "$(REPOS)" ]; then \
		echo "REPOS is required (comma-separated owner/name list)."; \
		exit 1; \
	fi
	@if [ -z "$(CONTEXT)" ]; then \
		echo "CONTEXT is required (technical|business)."; \
		exit 1; \
	fi
	@if [ -z "$(SCOPE)" ]; then \
		echo "SCOPE is required (e.g. uxmaltech, business — see MCP_TECHNICAL_SCOPES)."; \
		exit 1; \
	fi
	@if [ -z "$(MODE)" ]; then \
		echo "MODE is required (full|delta)."; \
		exit 1; \
	fi
	@cmd="npm run ingest:github --"; \
	for repo in $$(echo "$(REPOS)" | tr ',' ' '); do \
		cmd="$$cmd --repo $$repo"; \
	done; \
	cmd="$$cmd --context $(CONTEXT) --scope $(SCOPE) --mode $(MODE)"; \
	if [ -n "$(BRANCH)" ]; then cmd="$$cmd --branch $(BRANCH)"; fi; \
	if [ -n "$(INCLUDE_EXT)" ]; then cmd="$$cmd --include-ext $(INCLUDE_EXT)"; fi; \
	if [ -n "$(FROM_SHA)" ]; then cmd="$$cmd --from-sha $(FROM_SHA)"; fi; \
	if [ "$(DRY_RUN)" = "true" ]; then cmd="$$cmd --dry-run"; fi; \
	if [ -n "$(DEBUG)" ]; then cmd="$$cmd --debug $(DEBUG)"; fi; \
	if [ "$(SKIP_EMBED_CONFIRM)" = "true" ]; then cmd="$$cmd --skip-embed-confirm"; fi; \
	if [ "$(NO_PROGRESS)" = "true" ]; then cmd="$$cmd --no-progress"; fi; \
	echo "$$cmd"; \
	$$cmd
