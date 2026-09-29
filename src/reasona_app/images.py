import base64
import binascii
import re

from reasona_app.errors import ReasonaError

_DATA_URL_PATTERN = re.compile(
    r"^data:(?P<mime>image/(?:jpeg|png|webp));base64,(?P<data>[A-Za-z0-9+/=]+)$"
)


def validate_image_data_url(image_data_url: str, *, max_bytes: int) -> None:
    match = _DATA_URL_PATTERN.fullmatch(image_data_url)
    if match is None:
        raise ReasonaError(
            code="invalid_image",
            message="The live video frame must be a JPEG, PNG, or WebP data URL.",
            status_code=422,
            hint="Retake the image with the Reasona camera and try again.",
        )

    try:
        image_bytes = base64.b64decode(match.group("data"), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ReasonaError(
            code="invalid_image",
            message="The live video frame data is not valid base64.",
            status_code=422,
            hint="Retake the image with the Reasona camera and try again.",
        ) from exc

    if not image_bytes:
        raise ReasonaError(
            code="invalid_image",
            message="The live video frame is empty.",
            status_code=422,
            hint="Retake the image after the camera preview is visible.",
        )
    if len(image_bytes) > max_bytes:
        raise ReasonaError(
            code="image_too_large",
            message=f"The live video frame exceeds the {max_bytes:,}-byte limit.",
            status_code=413,
            hint="Retake the image at a lower camera resolution.",
        )

    mime_type = match.group("mime")
    if not _matches_signature(image_bytes, mime_type):
        raise ReasonaError(
            code="invalid_image",
            message="The live video frame content does not match its declared format.",
            status_code=422,
            hint="Retake the image with the Reasona camera and try again.",
        )


def _matches_signature(image_bytes: bytes, mime_type: str) -> bool:
    if mime_type == "image/jpeg":
        return image_bytes.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return (
            len(image_bytes) >= 12
            and image_bytes.startswith(b"RIFF")
            and image_bytes[8:12] == b"WEBP"
        )
    return False
