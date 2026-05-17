from __future__ import annotations

import base64
import json
import logging
import time
from io import BytesIO
from typing import Any

from PIL import Image

from backend.config import Config

logger = logging.getLogger(__name__)


class YOLOFoodService:
    """Optional, lazy-loaded YOLO food detector used as a GLM reference."""

    def __init__(self, config: Config | None = None) -> None:
        self.config = config or Config()
        self._model: Any | None = None
        self._labels_zh: dict[str, str] | None = None

    def detect(self, image_base64: str | None = None, image_url: str | None = None) -> dict[str, Any]:
        started = time.perf_counter()
        if not self.config.yolo_food_enabled:
            return self._result("disabled", started, message="YOLO food detector is disabled.")

        try:
            image = self._load_image(image_base64=image_base64, image_url=image_url)
            if image is None:
                return self._result("no_result", started, message="YOLO detector received no image input.")

            model = self._load_model()
            device = self._resolve_device()
            half = bool(self.config.yolo_food_half and device != "cpu")
            results = model.predict(
                source=image,
                imgsz=self.config.yolo_food_img_size,
                conf=self.config.yolo_food_conf,
                iou=self.config.yolo_food_iou,
                device=device,
                half=half,
                max_det=self.config.yolo_food_max_det,
                verbose=False,
            )
            detections = self._parse_detections(results[0] if results else None)
            elapsed = self._elapsed_ms(started)
            if detections:
                message = "YOLO detector exceeded soft timeout." if elapsed > self.config.yolo_food_timeout_ms else None
                return self._result("matched", started, detections=detections, message=message)
            if elapsed > self.config.yolo_food_timeout_ms:
                return self._result("timeout", started, message="YOLO detector exceeded soft timeout.")
            if not detections:
                return self._result("no_result", started, message="YOLO detector found no food above threshold.")
        except FileNotFoundError as exc:
            logger.warning("YOLO food detector unavailable: %s", exc)
            return self._result("unavailable", started, message=str(exc))
        except ImportError as exc:
            logger.warning("YOLO food detector dependency missing: %s", exc)
            return self._result("unavailable", started, message=str(exc))
        except Exception as exc:  # pragma: no cover
            logger.exception("YOLO food detector failed")
            return self._result("error", started, message=str(exc))

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model
        weight_path = self.config.yolo_food_weight_path
        if not weight_path.exists():
            raise FileNotFoundError(f"YOLO weight not found: {weight_path}")

        from ultralytics import YOLO

        self._model = YOLO(str(weight_path))
        return self._model

    def _resolve_device(self) -> str | int:
        configured = str(self.config.yolo_food_device or "auto").strip().lower()
        if configured and configured != "auto":
            return configured
        try:
            import torch

            return 0 if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    def _load_labels_zh(self) -> dict[str, str]:
        if self._labels_zh is not None:
            return self._labels_zh
        labels_path = self.config.yolo_food_labels_path
        if labels_path.exists():
            self._labels_zh = json.loads(labels_path.read_text(encoding="utf-8"))
        else:
            self._labels_zh = {}
        return self._labels_zh

    def _parse_detections(self, result: Any) -> list[dict[str, Any]]:
        if result is None or getattr(result, "boxes", None) is None:
            return []

        labels_zh = self._load_labels_zh()
        names = getattr(result, "names", {}) or getattr(getattr(result, "model", None), "names", {}) or {}
        height, width = getattr(result, "orig_shape", (1, 1))
        width = max(float(width or 1), 1.0)
        height = max(float(height or 1), 1.0)

        boxes = result.boxes
        xyxy = boxes.xyxy.cpu().tolist()
        class_ids = boxes.cls.cpu().tolist()
        confidences = boxes.conf.cpu().tolist()

        detections: list[dict[str, Any]] = []
        for coords, class_id_raw, confidence_raw in zip(xyxy, class_ids, confidences):
            class_id = int(class_id_raw)
            if isinstance(names, dict):
                raw_label = names.get(class_id, class_id)
            elif isinstance(names, list) and 0 <= class_id < len(names):
                raw_label = names[class_id]
            else:
                raw_label = class_id
            label = str(raw_label)
            confidence = float(confidence_raw)
            x1, y1, x2, y2 = [float(value) for value in coords]
            detections.append(
                {
                    "label": label,
                    "name_zh": labels_zh.get(label, label.replace("_", " ")),
                    "confidence": round(confidence, 4),
                    "bbox": [
                        round(max(0.0, min(1.0, x1 / width)), 4),
                        round(max(0.0, min(1.0, y1 / height)), 4),
                        round(max(0.0, min(1.0, x2 / width)), 4),
                        round(max(0.0, min(1.0, y2 / height)), 4),
                    ],
                }
            )

        detections.sort(key=lambda item: item["confidence"], reverse=True)
        return detections[: self.config.yolo_food_max_det]

    def _load_image(self, *, image_base64: str | None, image_url: str | None) -> Image.Image | None:
        payload = self._decode_image_payload(image_base64)
        if payload is None:
            payload = self._decode_image_payload(image_url)
        if payload is None and image_url and image_url.lower().startswith(("http://", "https://")):
            payload = self._download_image(image_url)
        if payload is None:
            return None

        image = Image.open(BytesIO(payload)).convert("RGB")
        max_side = self.config.yolo_food_max_image_side
        if max(image.size) > max_side:
            image.thumbnail((max_side, max_side))
        return image

    @staticmethod
    def _decode_image_payload(value: str | None) -> bytes | None:
        if not value:
            return None
        text = value.strip()
        if not text:
            return None
        if text.startswith("data:"):
            if "," not in text:
                return None
            text = text.split(",", 1)[1]
        try:
            return base64.b64decode(text, validate=True)
        except Exception:
            return None

    @staticmethod
    def _download_image(url: str) -> bytes | None:
        import requests

        response = requests.get(url, timeout=3)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if "image/" not in content_type.lower():
            return None
        return response.content[: 8 * 1024 * 1024]

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        return int((time.perf_counter() - started) * 1000)

    def _result(
        self,
        status: str,
        started: float,
        *,
        detections: list[dict[str, Any]] | None = None,
        message: str | None = None,
    ) -> dict[str, Any]:
        return {
            "status": status,
            "detections": detections or [],
            "model": self.config.yolo_food_weight_path.name,
            "elapsed_ms": self._elapsed_ms(started),
            "message": message,
        }


__all__ = ["YOLOFoodService"]
