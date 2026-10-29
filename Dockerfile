# syntax=docker/dockerfile:1
# Multi-stage build for Horologium Watch Atlas
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency manifests
COPY pyproject.toml uv.lock README.md ./

# Install python dependencies into a virtualenv
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    uv sync --frozen --no-dev --no-install-project

# Copy application source code
COPY backend ./backend

# Editable install preserves /app/backend and repository-relative resource paths.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    uv sync --frozen --no-dev

COPY content ./content
COPY frontend ./frontend

# Final runtime image
FROM python:3.12-slim-bookworm AS runner

WORKDIR /app

# Copy virtualenv and application from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/content /app/content
COPY --from=builder /app/frontend /app/frontend
COPY pyproject.toml ./

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PORT=8765

# Pre-build database on image creation
RUN python -m horologium.cli build-db

EXPOSE 8765

CMD ["python", "-m", "horologium.cli", "serve", "--host", "0.0.0.0"]
