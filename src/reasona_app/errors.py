class ReasonaError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        hint: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.hint = hint


class ConfigurationError(ReasonaError):
    def __init__(self, message: str, hint: str) -> None:
        super().__init__(
            code="configuration_required",
            message=message,
            status_code=503,
            hint=hint,
        )


class AgentUnavailableError(ReasonaError):
    def __init__(self, message: str, hint: str) -> None:
        super().__init__(
            code="agent_unavailable",
            message=message,
            status_code=503,
            hint=hint,
        )


class AgentOutputError(ReasonaError):
    def __init__(self, message: str) -> None:
        super().__init__(
            code="invalid_agent_output",
            message=message,
            status_code=502,
            hint=(
                "Try the analysis again. If it persists, inspect the agent trace "
                "in Microsoft Foundry."
            ),
        )
