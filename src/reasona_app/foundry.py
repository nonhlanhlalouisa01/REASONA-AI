import logging
from datetime import UTC, datetime
from functools import lru_cache
from typing import Protocol

from azure.ai.projects import AIProjectClient
from azure.core.exceptions import (
    ClientAuthenticationError,
    HttpResponseError,
    ServiceRequestError,
)
from azure.identity import DefaultAzureCredential
from openai import APIConnectionError, APIStatusError, OpenAIError

from reasona_app.config import Settings, get_settings
from reasona_app.errors import (
    AgentOutputError,
    AgentUnavailableError,
    ConfigurationError,
)
from reasona_app.images import validate_image_data_url
from reasona_app.models import (
    AnalysisMetadata,
    AnalysisResult,
    AnalyzeRequest,
    AnalyzeResponse,
    PreparationBrief,
    ReflectionAnalysis,
    ReflectRequest,
    VisionMetadata,
    VisionObservation,
    VisionRequest,
    VisionResponse,
)
from reasona_app.parsing import parse_agent_json
from reasona_app.prompts import build_analysis_prompt, build_vision_prompt

logger = logging.getLogger(__name__)


class AnalysisService(Protocol):
    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse: ...

    def analyze_vision(self, request: VisionRequest) -> VisionResponse: ...


class FoundryAnalysisService:
    def __init__(self, settings: Settings) -> None:
        if not settings.foundry_configured:
            raise ConfigurationError(
                "The Microsoft Foundry project endpoint is not configured.",
                "Copy .env.example to .env and set FOUNDRY_PROJECT_ENDPOINT.",
            )

        self._settings = settings
        self._credential = DefaultAzureCredential()
        self._project = AIProjectClient(
            endpoint=settings.foundry_project_endpoint,
            credential=self._credential,
        )
        self._openai = self._project.get_openai_client(
            agent_name=settings.foundry_agent_name
        )

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        prompt = build_analysis_prompt(request)
        raw_output = self._invoke_agent(prompt)

        result: AnalysisResult
        if isinstance(request, ReflectRequest):
            result = parse_agent_json(raw_output, ReflectionAnalysis)
        else:
            result = parse_agent_json(raw_output, PreparationBrief)

        return AnalyzeResponse(
            mode=request.mode,
            result=result,
            metadata=AnalysisMetadata(
                agent_name=self._settings.foundry_agent_name,
                agent_version=self._settings.foundry_agent_version,
                generated_at=datetime.now(UTC).isoformat(),
            ),
        )

    def analyze_vision(self, request: VisionRequest) -> VisionResponse:
        validate_image_data_url(
            request.image_data_url,
            max_bytes=self._settings.max_image_bytes,
        )
        prompt = build_vision_prompt(request)
        raw_output = self._invoke_agent_with_image(prompt, request.image_data_url)
        result = parse_agent_json(raw_output, VisionObservation)
        return VisionResponse(
            result=result,
            metadata=VisionMetadata(
                agent_name=self._settings.foundry_agent_name,
                agent_version=self._settings.foundry_agent_version,
                generated_at=datetime.now(UTC).isoformat(),
                on_device_face_count=request.detected_face_count,
            ),
        )

    def _invoke_agent(self, prompt: str) -> str:
        try:
            response = self._openai.responses.create(
                input=prompt,
                timeout=self._settings.foundry_timeout_seconds,
            )
        except ClientAuthenticationError as exc:
            logger.exception("Microsoft Foundry authentication failed")
            raise AgentUnavailableError(
                "Reasona could not authenticate with Microsoft Foundry.",
                "Run 'az login' with an account that has the Foundry User role on the project.",
            ) from exc
        except (ServiceRequestError, APIConnectionError) as exc:
            logger.exception("Microsoft Foundry could not be reached")
            raise AgentUnavailableError(
                "Reasona could not reach the Microsoft Foundry service.",
                "Check the network connection and the configured project endpoint.",
            ) from exc
        except (HttpResponseError, APIStatusError) as exc:
            status_code = getattr(exc, "status_code", None)
            logger.exception("Microsoft Foundry request failed with status %s", status_code)
            hint = (
                "Verify the agent endpoint is enabled and that reasona-ai version 2 is active."
                if status_code == 404
                else "Confirm Foundry access, agent status, quota, and project configuration."
            )
            raise AgentUnavailableError(
                "The Reasona Foundry agent could not complete the request.",
                hint,
            ) from exc
        except OpenAIError as exc:
            logger.exception("Microsoft Foundry returned an OpenAI client error")
            raise AgentUnavailableError(
                "The Reasona Foundry agent could not complete the request.",
                "Inspect the agent trace in Microsoft Foundry and try again.",
            ) from exc

        output_text = response.output_text
        if not output_text or not output_text.strip():
            raise AgentOutputError("The agent completed without returning analysis text.")
        return output_text

    def _invoke_agent_with_image(self, prompt: str, image_data_url: str) -> str:
        try:
            response = self._openai.responses.create(
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": prompt},
                            {
                                "type": "input_image",
                                "image_url": image_data_url,
                                "detail": "low",
                            },
                        ],
                    }
                ],
                timeout=self._settings.foundry_timeout_seconds,
            )
        except ClientAuthenticationError as exc:
            logger.exception("Microsoft Foundry vision authentication failed")
            raise AgentUnavailableError(
                "Reasona could not authenticate with Microsoft Foundry.",
                "Run 'az login' with an account that has the Foundry User role on the project.",
            ) from exc
        except (ServiceRequestError, APIConnectionError) as exc:
            logger.exception("Microsoft Foundry vision could not be reached")
            raise AgentUnavailableError(
                "Reasona could not reach Microsoft Foundry for visual analysis.",
                "Check the network connection and the configured project endpoint.",
            ) from exc
        except (HttpResponseError, APIStatusError) as exc:
            status_code = getattr(exc, "status_code", None)
            logger.exception(
                "Microsoft Foundry vision request failed with status %s",
                status_code,
            )
            raise AgentUnavailableError(
                "The Reasona Foundry agent could not analyze the approved still image.",
                (
                    "Confirm the active agent model supports image input and inspect "
                    "its Foundry trace."
                ),
            ) from exc
        except OpenAIError as exc:
            logger.exception("Microsoft Foundry vision returned an OpenAI client error")
            raise AgentUnavailableError(
                "The Reasona Foundry agent could not analyze the approved still image.",
                "Inspect the agent trace in Microsoft Foundry and try again.",
            ) from exc

        output_text = response.output_text
        if not output_text or not output_text.strip():
            raise AgentOutputError("The agent completed without returning visual observations.")
        return output_text


@lru_cache
def get_analysis_service() -> FoundryAnalysisService:
    return FoundryAnalysisService(get_settings())
