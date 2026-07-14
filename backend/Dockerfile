FROM python:3.11-slim

WORKDIR /app

RUN pip install uv gunicorn

COPY pyproject.toml .
RUN uv pip install --system -e ".[dev]"

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
# Production: gunicorn manages multiple uvicorn workers for concurrency.
# WEB_CONCURRENCY env var controls worker count (default 4).
# --proxy-headers trusts X-Forwarded-For from the upstream load balancer.
CMD ["sh", "-c", "gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker \
  -w ${WEB_CONCURRENCY:-4} \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --graceful-timeout 30 \
  --forwarded-allow-ips '*'"]
