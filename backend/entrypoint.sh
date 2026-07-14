#!/bin/bash
set -e

# Run database migrations before starting the server.
# `set -e` ensures the container exits (and the orchestrator restarts/fails it)
# if migrations fail, rather than starting the app against a stale schema.
alembic upgrade head

exec "$@"
