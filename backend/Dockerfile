ARG PYTHON_IMAGE=python:3.11-slim
FROM ${PYTHON_IMAGE}

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --extra yolo --index https://pypi.tuna.tsinghua.edu.cn/simple

COPY backend /app/backend
COPY ai_end /app/ai_end

EXPOSE 4420

CMD ["uv", "run", "flask", "--app", "app", "run", "--host", "0.0.0.0", "--port", "4420"]
