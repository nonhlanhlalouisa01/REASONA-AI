import json

import pytest

from reasona_app.errors import AgentOutputError
from reasona_app.models import ReflectionAnalysis
from reasona_app.parsing import parse_agent_json
from tests.factories import reflection_analysis


def test_parse_agent_json_accepts_markdown_fence() -> None:
    raw_json = reflection_analysis().model_dump_json(by_alias=True)

    parsed = parse_agent_json(f"```json\n{raw_json}\n```", ReflectionAnalysis)

    assert parsed.meeting_mirror.alignment == "shifted"
    assert parsed.insights[0].confidence == "high"


def test_parse_agent_json_rejects_missing_required_field() -> None:
    payload = reflection_analysis().model_dump(by_alias=True)
    del payload["meetingMirror"]

    with pytest.raises(AgentOutputError, match="meetingMirror"):
        parse_agent_json(json.dumps(payload), ReflectionAnalysis)


def test_parse_agent_json_rejects_non_json_output() -> None:
    with pytest.raises(AgentOutputError, match="did not contain a JSON object"):
        parse_agent_json("I cannot complete this request.", ReflectionAnalysis)

