import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
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
        if request.url.path != "/api/analyze":
            return await request_validation_exception_handler(request, exc)

        first_error = exc.errors()[0]
        field = ".".join(str(part) for part in first_error["loc"] if part != "body")
        payload = ErrorResponse(
            error=ErrorDetail(
                code="invalid_request",
                message=f"Check {field or 'the submitted information'}: {first_error['msg']}.",
                hint=(
                    "Complete the required fields and keep the transcript "
                    "within the stated limit."
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

    return application


app = create_app()
