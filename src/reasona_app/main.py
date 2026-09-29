import logging
from collections.abc import Awaitable, Callable
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from reasona_app.config import get_settings
from reasona_app.errors import ReasonaError
from reasona_app.foundry import AnalysisService, get_analysis_service
from reasona_app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    VisionRequest,
    VisionResponse,
)

logger = logging.getLogger(__name__)
PACKAGE_ROOT = Path(__file__).resolve().parent


def create_app(analysis_service: AnalysisService | None = None) -> FastAPI:
    application = FastAPI(
        title="Reasona AI",
        version="0.1.0",
        description="Psychology-informed preparation and reflection for customer conversations.",
    )
    application.state.analysis_service = analysis_service
    application.mount(
        "/static",
        StaticFiles(directory=PACKAGE_ROOT / "static"),
        name="static",
    )
    templates = Jinja2Templates(directory=PACKAGE_ROOT / "templates")

    @application.middleware("http")
    async def add_security_headers(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com; "
            "media-src 'self' blob:; "
            "worker-src 'self' blob:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self'"
        )
        response.headers["Permissions-Policy"] = (
            "camera=(self), microphone=(), geolocation=()"
        )
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @application.exception_handler(ReasonaError)
    async def handle_reasona_error(
        _request: Request,
        exc: ReasonaError,
    ) -> JSONResponse:
        payload = ErrorResponse(
            error=ErrorDetail(code=exc.code, message=exc.message, hint=exc.hint)
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=payload.model_dump(by_alias=True),
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        if request.url.path not in {"/api/analyze", "/api/vision/analyze"}:
            return await request_validation_exception_handler(request, exc)

        first_error = exc.errors()[0]
        field = ".".join(str(part) for part in first_error["loc"] if part != "body")
        payload = ErrorResponse(
            error=ErrorDetail(
                code="invalid_request",
                message=f"Check {field or 'the submitted information'}: {first_error['msg']}.",
                hint=(
                    "Complete the required fields, confirm consent when visual analysis "
                    "is requested, and keep content within the stated limits."
                ),
            )
        )
        return JSONResponse(status_code=422, content=payload.model_dump(by_alias=True))

    @application.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        settings = get_settings()
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "agent_name": settings.foundry_agent_name,
                "agent_version": settings.foundry_agent_version,
                "max_transcript_characters": settings.max_transcript_characters,
            },
        )

    @application.get("/api/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        settings = get_settings()
        return HealthResponse(
            status="ok" if settings.foundry_configured else "configuration_required",
            foundry_configured=settings.foundry_configured,
            agent_name=settings.foundry_agent_name,
            agent_version=settings.foundry_agent_version,
        )

    @application.post(
        "/api/analyze",
        response_model=AnalyzeResponse,
        responses={
            422: {"model": ErrorResponse},
            502: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def analyze(payload: AnalyzeRequest, request: Request) -> AnalyzeResponse:
        service = request.app.state.analysis_service or get_analysis_service()
        return service.analyze(payload)

    @application.post(
        "/api/vision/analyze",
        response_model=VisionResponse,
        responses={
            413: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            502: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def analyze_vision(payload: VisionRequest, request: Request) -> VisionResponse:
        service = request.app.state.analysis_service or get_analysis_service()
        return service.analyze_vision(payload)

    return application


app = create_app()
