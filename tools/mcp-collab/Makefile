SHELL := /bin/sh

# Load .env from project root (does not fail if missing).
# When invoked via the root Makefile, variables arrive via `export`.
-include ../../.env

# Local-only defaults (not in .env)
MCP_PID_FILE ?= .pid
MCP_LOG_FILE ?= mcp.log

.PHONY: up down dev status install

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
	@node --watch --env-file=../../.env server.mjs

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
