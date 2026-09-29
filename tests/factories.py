from reasona_app.models import (
    Alignment,
    AnalysisMetadata,
    AnalysisMode,
    AnalyzeResponse,
    Confidence,
    ConversationPlaybook,
    EvidenceInsight,
    MeetingMirror,
    PreparationBrief,
    PsychologyContext,
    ReflectionAnalysis,
    ResearchSuggestion,
)


def reflection_analysis() -> ReflectionAnalysis:
    return ReflectionAnalysis(
        executive_summary=(
            "The customer shifted the discussion from architecture toward accountability "
            "and employee impact."
        ),
        meeting_mirror=MeetingMirror(
            headline="The architecture meeting became a governance conversation.",
            intended_conversation="Explain the architecture and agree a proof of concept.",
            observed_conversation="Clarify accountability, employee impact, and data retention.",
            alignment=Alignment.SHIFTED,
            explanation=(
                "Most customer questions focused on governance and adoption rather than "
                "technical design."
            ),
        ),
        topic_journey=["Architecture", "Trust", "Employee impact", "Governance"],
        insights=[
            EvidenceInsight(
                title="Accountability needs an explicit owner",
                what_happened="The customer asked who owns the risk of a poor answer.",
                evidence='"Who is accountable if a member of staff acts on a poor answer?"',
                why_it_may_matter="The decision path is unclear without named accountability.",
                what_to_do_next="Bring a draft responsibility model to the next meeting.",
                confidence=Confidence.HIGH,
            )
        ],
        repeated_questions=["Who owns the risk?"],
        explicit_concerns=["Employee involvement before a proof of concept"],
        commitments=["Send retention options by Friday"],
        unresolved_questions=["How will unions be involved?"],
        psychology_context=[
            PsychologyContext(
                lens="Procedural fairness",
                observable_pattern="The customer repeatedly asked how employees would be involved.",
                why_relevant="Participation may influence confidence in the change process.",
                caution="This is a communication lens, not a claim about anyone's internal state.",
            )
        ],
        playbook=ConversationPlaybook(
            lead_with="Acknowledge the governance questions before returning to architecture.",
            clarify_next=["Decision ownership", "Employee engagement route"],
            questions_to_ask=[
                "What would responsible ownership look like in your operating model?",
                "Who needs to be involved before a proof of concept is considered?",
            ],
            evidence_to_bring=["Draft responsibility model"],
            simplify=["Describe controls in terms of employee decisions"],
            follow_ups=["Send retention options"],
            suggested_next_step="Run a governance workshop before deciding on a proof of concept.",
        ),
        responsible_use_note=(
            "These observations are grounded in the supplied conversation and should be "
            "reviewed by the account team."
        ),
    )


def preparation_brief() -> PreparationBrief:
    return PreparationBrief(
        executive_summary=(
            "Lead with accountability and employee involvement, then use architecture only "
            "to support those priorities."
        ),
        customer_priorities=["Clear accountability", "Meaningful employee involvement"],
        assumptions_to_test=["A governance workshop is the preferred next step"],
        recommended_approach=(
            "Begin by reflecting the customer's concerns, test the proposed decision path, "
            "and agree success criteria before discussing a proof of concept."
        ),
        suggested_opening=(
            "We heard that governance and employee impact need to come before a technical pilot."
        ),
        questions_to_ask=[
            "Who needs to own each risk?",
            "How should employees be involved?",
            "What evidence would support a decision?",
        ],
        evidence_to_bring=["Draft responsibility model", "Retention options"],
        research_to_complete=[
            ResearchSuggestion(
                topic="Public-sector AI impact assessment practice",
                why_it_matters="The customer requested an example assessment.",
                evidence_to_find="A relevant, current assessment template and approval process.",
            )
        ],
        communication_watchouts=["Do not treat agreement to a workshop as approval for a pilot"],
        success_outcomes=["Named owners and an agreed governance next step"],
        responsible_use_note=(
            "This brief separates known evidence from assumptions that should be tested "
            "in the room."
        ),
    )


def reflection_response() -> AnalyzeResponse:
    return AnalyzeResponse(
        mode=AnalysisMode.REFLECT,
        result=reflection_analysis(),
        metadata=AnalysisMetadata(
            agent_name="reasona-ai",
            agent_version="2",
            generated_at="2026-09-29T10:00:00+00:00",
        ),
    )
