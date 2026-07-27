# syntax=docker/dockerfile:1

# =============================================================================
# Control Tower — backend image
# Multi-stage: deps are resolved in a throwaway builder, only the venv + app
# source land in the runtime layer. Runs as a non-root user.
# =============================================================================

# ---- builder ----------------------------------------------------------------
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    VIRTUAL_ENV=/opt/venv

RUN pip install --no-cache-dir uv==0.4.27

WORKDIR /build

# Dependency layer: install against a STUB app package so this layer is keyed
# on pyproject.toml alone — editing Python source no longer reinstalls every
# wheel. hatchling packages ["app"], so the dir has to exist for the build.
# gunicorn is the production process manager and is deliberately not a
# pyproject dependency (local dev runs uvicorn directly).
COPY pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py \
 && uv venv "$VIRTUAL_ENV" \
 && uv pip install --no-cache . "gunicorn==23.0.0"

# Source layer: reinstall only the app package over the cached deps.
COPY app ./app
RUN uv pip install --no-cache --no-deps .

# ---- runtime ----------------------------------------------------------------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    WEB_CONCURRENCY=4

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# alembic/ + alembic.ini are required at runtime — entrypoint.sh runs
# `alembic upgrade head` before the server starts.
COPY alembic.ini entrypoint.sh ./
COPY alembic ./alembic
COPY app ./app

RUN chmod +x entrypoint.sh \
 && useradd --system --uid 10001 --no-create-home appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# No curl in the slim image — urllib is already in the venv. /health returns
# 503 (raises HTTPError) when the DB is unreachable, which is what we want.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=8)"]

ENTRYPOINT ["./entrypoint.sh"]

# gunicorn manages WEB_CONCURRENCY uvicorn workers.
# --forwarded-allow-ips: trust X-Forwarded-For from the Caddy edge container.
# Only the reverse proxy can reach this port (no host binding in prod compose),
# so '*' is safe here and is what makes per-IP rate limiting key on the real
# client instead of the proxy.
CMD ["sh", "-c", "exec gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w ${WEB_CONCURRENCY:-4} \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --graceful-timeout 30 \
  --access-logfile - \
  --forwarded-allow-ips '*'"]
