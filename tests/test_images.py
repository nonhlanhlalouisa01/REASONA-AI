import base64

import pytest

from reasona_app.errors import ReasonaError
from reasona_app.images import validate_image_data_url

_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/x8AAusB9Y9Zl9sAAAAASUVORK5CYII="
)


def test_validate_image_data_url_accepts_png() -> None:
    validate_image_data_url(_PNG_DATA_URL, max_bytes=1_000_000)


def test_validate_image_data_url_rejects_unsupported_mime_type() -> None:
    with pytest.raises(ReasonaError, match="JPEG, PNG, or WebP"):
        validate_image_data_url(
            "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            max_bytes=1_000_000,
        )


def test_validate_image_data_url_rejects_mismatched_signature() -> None:
    fake_png = "data:image/png;base64," + base64.b64encode(b"not-a-png").decode()

    with pytest.raises(ReasonaError, match="does not match"):
        validate_image_data_url(fake_png, max_bytes=1_000_000)


def test_validate_image_data_url_enforces_decoded_size_limit() -> None:
    oversized = "data:image/png;base64," + base64.b64encode(
        b"\x89PNG\r\n\x1a\n" + b"x" * 100
    ).decode()

    with pytest.raises(ReasonaError, match="exceeds"):
        validate_image_data_url(oversized, max_bytes=32)
