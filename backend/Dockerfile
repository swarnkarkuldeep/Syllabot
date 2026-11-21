FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
# CPU-only PyTorch: the container has no GPU access, and the default PyPI
# wheel drags in several GB of CUDA libraries. TORCH_VERSION is repeated on
# the second install so a future version clash fails the build instead of
# silently pulling the CUDA build back in.
ARG TORCH_VERSION=2.14.0
RUN pip install --upgrade pip \
    && pip install "torch==${TORCH_VERSION}" --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements.txt "torch==${TORCH_VERSION}"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]