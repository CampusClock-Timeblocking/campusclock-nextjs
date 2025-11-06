FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Set default solver config (can be overridden at runtime)
    SOLVER_TIMEOUT_SECONDS=30 \
    SOLVER_NUM_WORKERS=4

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./

EXPOSE 8000

# Health check to ensure the service is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://localhost:8000/health').read()" || exit 1

# Run the FastAPI app - correct module path is "main:app" since main.py is in /app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


