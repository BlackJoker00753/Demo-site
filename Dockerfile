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
COPY pyproject.toml uv.lock ./

# Install python dependencies into a virtualenv
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source code
COPY backend ./backend
COPY content ./content
COPY frontend ./frontend

# Install the horologium package
RUN uv sync --frozen --no-dev

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
    PORT=8765 \
    HOST=0.0.0.0

# Pre-build database on image creation
RUN python -m horologium.cli build-db

EXPOSE 8765

CMD ["python", "-m", "horologium.cli", "serve"]
