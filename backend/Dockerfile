ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN pip install --no-cache-dir uv -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --index https://pypi.tuna.tsinghua.edu.cn/simple

COPY backend /app/backend
COPY ai_end /app/ai_end

EXPOSE 4420

CMD ["uv", "run", "flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "4420"]
