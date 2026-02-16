SHELL := /bin/sh

# ---------------------------------------------------------------------------
# MCP Server configuration
# All variables can be overridden from the parent Makefile or environment.
# ---------------------------------------------------------------------------

QDRANT_URL ?= http://localhost:6333
QDRANT_VECTOR_SIZE ?= 1536
ARCH_COLLECTION ?= collab-architecture-canon
BUSINESS_COLLECTION ?= business-architecture-canon

NEBULA_CONSOLE_IMAGE ?= vesoft/nebula-console:v3.6.0
NEBULA_NETWORK ?= collab-architecture_default
NEBULA_ADDR ?= graphd
NEBULA_PORT ?= 9669
NEBULA_USER ?= root
NEBULA_PASSWORD ?= nebula
ARCH_SPACE ?= collab_architecture
BUSINESS_SPACE ?= business_architecture

MCP_HOST ?= 127.0.0.1
MCP_PORT ?= 7337
MCP_API_KEYS ?=
MCP_PID_FILE ?= .pid
MCP_LOG_FILE ?= mcp.log

.PHONY: up down config status install

install:
	@[ -d node_modules ] || npm install

up: install
	@if [ -f $(MCP_PID_FILE) ] && kill -0 "$$(cat $(MCP_PID_FILE))" 2>/dev/null; then \
		echo "MCP server already running (PID $$(cat $(MCP_PID_FILE)))"; \
	else \
		QDRANT_URL=$(QDRANT_URL) \
		QDRANT_VECTOR_SIZE=$(QDRANT_VECTOR_SIZE) \
		ARCH_COLLECTION=$(ARCH_COLLECTION) \
		BUSINESS_COLLECTION=$(BUSINESS_COLLECTION) \
		NEBULA_CONSOLE_IMAGE=$(NEBULA_CONSOLE_IMAGE) \
		NEBULA_NETWORK=$(NEBULA_NETWORK) \
		NEBULA_ADDR=$(NEBULA_ADDR) \
		NEBULA_PORT=$(NEBULA_PORT) \
		NEBULA_USER=$(NEBULA_USER) \
		NEBULA_PASSWORD=$(NEBULA_PASSWORD) \
		ARCH_SPACE=$(ARCH_SPACE) \
		BUSINESS_SPACE=$(BUSINESS_SPACE) \
		MCP_HOST=$(MCP_HOST) \
		MCP_PORT=$(MCP_PORT) \
		MCP_API_KEYS=$(MCP_API_KEYS) \
		node server.mjs > $(MCP_LOG_FILE) 2>&1 & \
		echo $$! > $(MCP_PID_FILE); \
		pid=$$(cat $(MCP_PID_FILE)); \
		sleep 2; \
		if kill -0 $$pid 2>/dev/null; then \
			echo "MCP server started on http://$(MCP_HOST):$(MCP_PORT)/mcp (PID $$pid)"; \
		else \
			echo "Failed to start MCP server, see $(MCP_LOG_FILE) for details"; \
			rm -f $(MCP_PID_FILE); \
			exit 1; \
		fi; \
	fi

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
		echo "MCP server running (PID $$(cat $(MCP_PID_FILE))) on http://$(MCP_HOST):$(MCP_PORT)/mcp"; \
	else \
		echo "MCP server not running"; \
	fi
