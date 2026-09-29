import json
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from reasona_app.errors import AgentOutputError

ModelT = TypeVar("ModelT", bound=BaseModel)


def parse_agent_json(raw_output: str, model: type[ModelT]) -> ModelT:
    candidate = raw_output.strip()
    if candidate.startswith("```"):
        lines = candidate.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end < start:
        raise AgentOutputError("The agent response did not contain a JSON object.")

    try:
        payload = json.loads(candidate[start : end + 1])
    except json.JSONDecodeError as exc:
        raise AgentOutputError(
            f"The agent returned malformed JSON near character {exc.pos}."
        ) from exc

    try:
        return model.model_validate(payload)
    except ValidationError as exc:
        first_error = exc.errors(include_url=False)[0]
        location = ".".join(str(part) for part in first_error["loc"])
        message = first_error["msg"]
        raise AgentOutputError(
            f"The agent response did not match the expected structure at {location}: {message}."
        ) from exc

