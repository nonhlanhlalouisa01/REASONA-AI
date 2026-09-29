from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
    )


class AnalysisMode(StrEnum):
    REFLECT = "reflect"
    PREPARE = "prepare"


class Alignment(StrEnum):
    ALIGNED = "aligned"
    SHIFTED = "shifted"
    DIVERGED = "diverged"
    UNCLEAR = "unclear"


class Confidence(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FramingQuality(StrEnum):
    CLEAR = "clear"
    ADJUST = "adjust"
    UNCLEAR = "unclear"


class ReflectRequest(ApiModel):
    mode: Literal[AnalysisMode.REFLECT]
    meeting_title: str = Field(min_length=3, max_length=120)
    objective: str = Field(min_length=10, max_length=1_500)
    customer_context: str = Field(default="", max_length=8_000)
    transcript: str = Field(min_length=80, max_length=60_000)


class PrepareRequest(ApiModel):
    mode: Literal[AnalysisMode.PREPARE]
    meeting_title: str = Field(min_length=3, max_length=120)
    meeting_goal: str = Field(min_length=10, max_length=1_500)
    customer_context: str = Field(min_length=20, max_length=8_000)
    previous_notes: str = Field(default="", max_length=20_000)
    known_concerns: str = Field(default="", max_length=8_000)


AnalyzeRequest = Annotated[ReflectRequest | PrepareRequest, Field(discriminator="mode")]


class MeetingMirror(ApiModel):
    headline: str = Field(min_length=5, max_length=180)
    intended_conversation: str = Field(min_length=5, max_length=1_000)
    observed_conversation: str = Field(min_length=5, max_length=1_000)
    alignment: Alignment
    explanation: str = Field(min_length=10, max_length=1_500)


class EvidenceInsight(ApiModel):
    title: str = Field(min_length=3, max_length=120)
    what_happened: str = Field(min_length=10, max_length=1_000)
    evidence: str = Field(min_length=3, max_length=1_200)
    why_it_may_matter: str = Field(min_length=10, max_length=1_000)
    what_to_do_next: str = Field(min_length=10, max_length=1_000)
    confidence: Confidence


class PsychologyContext(ApiModel):
    lens: str = Field(min_length=3, max_length=120)
    observable_pattern: str = Field(min_length=10, max_length=1_000)
    why_relevant: str = Field(min_length=10, max_length=1_000)
    caution: str = Field(min_length=10, max_length=700)


class ConversationPlaybook(ApiModel):
    lead_with: str = Field(min_length=10, max_length=1_000)
    clarify_next: list[str] = Field(min_length=1, max_length=8)
    questions_to_ask: list[str] = Field(min_length=2, max_length=10)
    evidence_to_bring: list[str] = Field(default_factory=list, max_length=8)
    simplify: list[str] = Field(default_factory=list, max_length=8)
    follow_ups: list[str] = Field(default_factory=list, max_length=10)
    suggested_next_step: str = Field(min_length=10, max_length=1_000)


class ReflectionAnalysis(ApiModel):
    executive_summary: str = Field(min_length=20, max_length=2_000)
    meeting_mirror: MeetingMirror
    topic_journey: list[str] = Field(min_length=1, max_length=10)
    insights: list[EvidenceInsight] = Field(min_length=1, max_length=6)
    repeated_questions: list[str] = Field(default_factory=list, max_length=10)
    explicit_concerns: list[str] = Field(default_factory=list, max_length=10)
    commitments: list[str] = Field(default_factory=list, max_length=12)
    unresolved_questions: list[str] = Field(default_factory=list, max_length=12)
    psychology_context: list[PsychologyContext] = Field(default_factory=list, max_length=4)
    playbook: ConversationPlaybook
    responsible_use_note: str = Field(min_length=20, max_length=700)


class ResearchSuggestion(ApiModel):
    topic: str = Field(min_length=3, max_length=160)
    why_it_matters: str = Field(min_length=10, max_length=700)
    evidence_to_find: str = Field(min_length=10, max_length=700)


class PreparationBrief(ApiModel):
    executive_summary: str = Field(min_length=20, max_length=2_000)
    customer_priorities: list[str] = Field(min_length=1, max_length=10)
    assumptions_to_test: list[str] = Field(min_length=1, max_length=8)
    recommended_approach: str = Field(min_length=20, max_length=1_500)
    suggested_opening: str = Field(min_length=10, max_length=1_000)
    questions_to_ask: list[str] = Field(min_length=3, max_length=12)
    evidence_to_bring: list[str] = Field(default_factory=list, max_length=10)
    research_to_complete: list[ResearchSuggestion] = Field(default_factory=list, max_length=8)
    communication_watchouts: list[str] = Field(default_factory=list, max_length=8)
    success_outcomes: list[str] = Field(min_length=1, max_length=8)
    responsible_use_note: str = Field(min_length=20, max_length=700)


AnalysisResult = ReflectionAnalysis | PreparationBrief


class VisionRequest(ApiModel):
    image_data_url: str = Field(min_length=100, max_length=6_000_000)
    consent_confirmed: Literal[True]
    detected_face_count: int | None = Field(default=None, ge=0, le=20)


class VisionObservation(ApiModel):
    summary: str = Field(min_length=20, max_length=1_500)
    visible_faces: int = Field(ge=0, le=20)
    framing_quality: FramingQuality
    face_visibility: list[str] = Field(default_factory=list, max_length=8)
    posture_and_position: list[str] = Field(max_length=8)
    head_orientation: list[str] = Field(max_length=8)
    visible_gestures: list[str] = Field(max_length=8)
    lighting_observations: list[str] = Field(default_factory=list, max_length=8)
    visible_context: list[str] = Field(default_factory=list, max_length=8)
    practical_suggestions: list[str] = Field(default_factory=list, max_length=8)
    conversation_context_note: str = Field(min_length=10, max_length=1_000)
    limitations_note: str = Field(min_length=20, max_length=700)


class AnalysisMetadata(ApiModel):
    agent_name: str
    agent_version: str
    generated_at: str


class AnalyzeResponse(ApiModel):
    mode: AnalysisMode
    result: AnalysisResult
    metadata: AnalysisMetadata


class VisionMetadata(ApiModel):
    agent_name: str
    agent_version: str
    generated_at: str
    on_device_face_count: int | None = None


class VisionResponse(ApiModel):
    result: VisionObservation
    metadata: VisionMetadata


class HealthResponse(ApiModel):
    status: Literal["ok", "configuration_required"]
    foundry_configured: bool
    agent_name: str
    agent_version: str


class ErrorDetail(ApiModel):
    code: str
    message: str
    hint: str | None = None


class ErrorResponse(ApiModel):
    error: ErrorDetail
