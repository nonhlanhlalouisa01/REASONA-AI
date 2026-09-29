from fastapi.testclient import TestClient

from reasona_app.main import create_app
from reasona_app.models import AnalyzeRequest, AnalyzeResponse
from tests.factories import reflection_response


class FakeAnalysisService:
    def analyze(self, _request: AnalyzeRequest) -> AnalyzeResponse:
        return reflection_response()


def test_index_renders_workspace() -> None:
    client = TestClient(create_app(FakeAnalysisService()))

    response = client.get("/")

    assert response.status_code == 200
    assert "Meeting mirror" in response.text
    assert "reasona-ai" in response.text


def test_analyze_returns_camel_case_contract() -> None:
    client = TestClient(create_app(FakeAnalysisService()))

    response = client.post(
        "/api/analyze",
        json={
            "mode": "reflect",
            "meetingTitle": "AI adoption discovery",
            "objective": "Agree whether a proof of concept is the right next step.",
            "customerContext": "A public-sector customer exploring an employee AI assistant.",
            "transcript": (
                "Customer: Who is accountable if an answer is wrong? "
                "Presenter: We need to agree the operating model. "
                "Customer: Please focus the next session on governance and employee involvement."
            ),
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "reflect"
    assert payload["result"]["meetingMirror"]["alignment"] == "shifted"
    assert payload["metadata"]["agentVersion"] == "2"


def test_analyze_rejects_short_transcript() -> None:
    client = TestClient(create_app(FakeAnalysisService()))

    response = client.post(
        "/api/analyze",
        json={
            "mode": "reflect",
            "meetingTitle": "AI adoption discovery",
            "objective": "Agree whether a proof of concept is the right next step.",
            "customerContext": "",
            "transcript": "Too short.",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"

