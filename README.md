# Reasona AI

**Understand the conversation. Understand the human context. Land the message better.**

Reasona AI is a psychology-informed engagement assistant for sales and customer-facing teams. It
helps a user prepare for a customer conversation, reflect on authorised meeting evidence, and turn
what happened into a practical next-conversation playbook.

Most meeting assistants tell you what was said. Reasona helps answer a different question:

> Is the conversation you thought you were having the conversation that actually happened?

## MVP capabilities

The interface uses Reasona's forest-green and cream palette with serif headings, plus a
matching dark theme. Camera controls share the same styling.

### Meeting Mirror

Add the intended outcome, customer context, and an authorised transcript. Reasona returns:

- the intended conversation compared with the observed conversation;
- the topic journey, repeated questions, explicit concerns, commitments, and unresolved questions;
- evidence-backed insights in the form **what happened → evidence → why it may matter → what next**;
- cautious psychology and communication lenses based on observable patterns; and
- a Next Conversation Playbook with questions, evidence, follow-ups, and a recommended next step.

### Conversation Prep

Add the next meeting goal, known context, previous notes, and explicit concerns. Reasona returns:

- likely customer priorities and assumptions to test;
- a recommended conversation structure and suggested opening;
- questions to ask and evidence to bring;
- research to complete and communication watchouts; and
- clear success outcomes for the meeting.

### Camera Vision

Open **Camera vision** to:

- see a live face count and framing boxes that run in the browser;
- explicitly enable live Foundry observations, sampled at one current frame every five seconds;
- capture a still only when the user chooses;
- require confirmation that visible people agreed before either live or still-image analysis;
- receive non-biometric observations about face count, framing, lighting, posture and position,
  head orientation, visible gestures, and meeting context;
- review an accumulating observable-cues report and download it as JSON; and
- add only a safe text note to customer context.

The live detector does not identify people and does not upload frames. The browser downloads the
pinned MediaPipe Tasks Vision library from jsDelivr and Google's face-detection model when the
camera starts; detection then runs locally. If the user separately enables **Start live analysis**,
the browser sends one current frame to Microsoft Foundry every five seconds until stopped. Live
analysis stops when consent is withdrawn, the camera workspace closes, or the tab is hidden. A
captured still is sent only after the user confirms consent and selects
**Analyze approved still**.

## Responsible by design

Reasona supports human judgement; it does not replace it. The application:

- uses authorised content supplied by the user;
- does not persist meeting content or analysis;
- clears the camera stream and captured still from browser state when the camera workspace closes;
- treats transcripts and notes as untrusted evidence, not instructions;
- does not perform face recognition or create biometric templates;
- does not infer sentiment, hidden emotions, attention, engagement, personality, honesty,
  intelligence, mental health, demographics, or private intent from visual cues;
- labels interpretations cautiously and requires observable evidence; and
- fails explicitly when the Foundry agent is unavailable or returns an invalid structure.

The browser can download a result as JSON or print it, but the app does not create server-side
meeting history.

## Architecture

```text
Browser
  │
  ├─ on-device MediaPipe face detection (live frames remain local)
  │
  │  JSON over HTTPS (text or one explicitly approved still)
  ▼
FastAPI application
  ├─ Pydantic request and response contracts
  ├─ evidence-first prompt builder
  ├─ strict agent-output validation
  └─ Azure DefaultAzureCredential
       │
       ▼
Microsoft Foundry project
  └─ prompt agent: reasona-ai (expected version: 2)
```

The backend uses the Microsoft Foundry Projects 2.x SDK and binds an OpenAI Responses client to the
existing `reasona-ai` prompt agent. Credentials remain server-side.

## Local setup

### Prerequisites

- Python 3.11, 3.12, or 3.13 (3.13 recommended)
- Azure CLI
- Access to the configured Microsoft Foundry project with the **Foundry User** role

### Install

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Sign in to the tenant that owns the Foundry project:

```powershell
az login
az account set --subscription 814a28c7-fe56-4bad-94c8-2174c1051fe6
```

No API key is stored in the repository. `DefaultAzureCredential` uses the signed-in Azure CLI
identity locally and can use a managed identity when hosted on Azure.

### Run

```powershell
reasona
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000), choose **Meeting mirror** or
**Conversation prep**, and select **Load an example** for a safe demonstration.

### Validate

```powershell
ruff check .
pytest
mypy
```

## Configuration

| Environment variable | Purpose | Default/example |
|---|---|---|
| `FOUNDRY_PROJECT_ENDPOINT` | Foundry project endpoint | See `.env.example` |
| `FOUNDRY_AGENT_NAME` | Existing prompt-agent name | `reasona-ai` |
| `FOUNDRY_AGENT_VERSION` | Expected active version shown in output metadata | `2` |
| `FOUNDRY_TIMEOUT_SECONDS` | Per-analysis SDK timeout | `120` |
| `MAX_TRANSCRIPT_CHARACTERS` | UI transcript limit | `60000` |
| `MAX_IMAGE_BYTES` | Decoded still-image limit | `4000000` |

The Foundry agent endpoint routes requests by agent name. `FOUNDRY_AGENT_VERSION` documents the
expected active version and makes drift visible in every downloaded result.

## Troubleshooting

### Authentication failed

Run `az login`, select the correct subscription, and confirm the signed-in identity has the
**Foundry User** role on the project.

### Agent endpoint returns 404

Confirm that `reasona-ai` exists in the configured project, version 2 is active, and the agent
endpoint has the Responses protocol enabled. The API intentionally returns an explicit
`agent_unavailable` error rather than substituting mock analysis.

### Agent output could not be validated

Inspect the agent trace in Microsoft Foundry. The app rejects malformed or incomplete analysis
instead of guessing missing evidence.

### Camera does not start

Use `http://127.0.0.1:8000` or HTTPS, grant camera permission when prompted, and close any other
application that has exclusive control of the camera. If the on-device detector cannot download,
the app reports that face boxes are unavailable but still allows an explicitly approved still to
be captured.

## Collaboration

Use a feature branch for changes, run the validation commands above, and open a pull request against
`main`. Do not commit `.env`, tokens, transcripts, customer notes, or generated analysis.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](./LICENSE).
