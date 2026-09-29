(() => {
  "use strict";

  const body = document.body;
  const form = document.querySelector("#analysis-form");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const reflectFields = document.querySelector("#reflect-fields");
  const prepareFields = document.querySelector("#prepare-fields");
  const transcript = document.querySelector("#transcript");
  const transcriptCount = document.querySelector("#transcript-count");
  const titleInput = document.querySelector("#meeting-title");
  const goalInput = document.querySelector("#meeting-goal");
  const contextInput = document.querySelector("#customer-context");
  const previousNotes = document.querySelector("#previous-notes");
  const knownConcerns = document.querySelector("#known-concerns");
  const emptyState = document.querySelector("#empty-state");
  const loadingState = document.querySelector("#loading-state");
  const errorState = document.querySelector("#error-state");
  const analysisResult = document.querySelector("#analysis-result");
  const resultActions = document.querySelector("#result-actions");
  const submitButton = document.querySelector("#submit-analysis");
  const submitLabel = document.querySelector("#submit-label");
  const visionDialog = document.querySelector("#vision-dialog");
  const cameraVideo = document.querySelector("#camera-video");
  const faceOverlay = document.querySelector("#face-overlay");
  const cameraPlaceholder = document.querySelector("#camera-placeholder");
  const cameraMessage = document.querySelector("#camera-message");
  const faceStatus = document.querySelector("#face-status");
  const startCameraButton = document.querySelector("#start-camera");
  const stopCameraButton = document.querySelector("#stop-camera");
  const liveAnalysisConsent = document.querySelector("#live-analysis-consent");
  const toggleLiveAnalysisButton = document.querySelector("#toggle-live-analysis");
  const liveAnalysisStatus = document.querySelector("#live-analysis-status");
  const liveAnalysisIndicator = document.querySelector("#live-analysis-indicator");
  const visionResultEmpty = document.querySelector("#vision-result-empty");
  const visionResultLoading = document.querySelector("#vision-result-loading");
  const visionResultError = document.querySelector("#vision-result-error");
  const visionResult = document.querySelector("#vision-result");
  const visionTabButtons = [...document.querySelectorAll("[data-vision-tab]")];
  const visionTabPanels = [...document.querySelectorAll("[data-vision-panel]")];
  const visionReportReady = document.querySelector("#vision-report-ready");
  const maxTranscriptCharacters = Number(body.dataset.maxTranscriptCharacters || 60000);

  const state = {
    mode: "reflect",
    lastResponse: null,
    loadingTimer: null,
    camera: {
      stream: null,
      detector: null,
      animationFrame: null,
      detectionPending: false,
      lastDetectionAt: 0,
      faceCount: null,
      contextNote: null,
      latestResult: null,
      liveAnalysisEnabled: false,
      liveAnalysisTimer: null,
      liveAnalysisControllers: new Set(),
      liveAnalysisSequence: 0,
      latestVisionSequence: 0,
      report: {
        analyzedFrames: 0,
        postureAndPosition: [],
        headOrientation: [],
        visibleGestures: [],
        environmentObservations: [],
        practicalSuggestions: [],
      },
    },
  };

  const MEDIAPIPE_MODULE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs";
  const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
  const FACE_DETECTOR_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_detector/" +
    "blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

  const copy = {
    reflect: {
      pageTitle: "Meeting mirror",
      eyebrow: "After the conversation",
      heading: "Did the conversation you planned actually happen?",
      description:
        "Bring the objective and authorised transcript. Reasona will surface observable patterns, show the evidence, and turn them into a practical next-conversation playbook.",
      goalLabel: "What did you want the meeting to achieve?",
      goalPlaceholder:
        "Describe the conversation you intended to have and the outcome you hoped for.",
      contextLabel: "Customer context",
      contextOptional: true,
      outputTitle: "Your meeting mirror will appear here",
      outputCopy:
        "Reasona will compare intention with evidence, identify communication patterns, and build a practical playbook for the next conversation.",
      submit: "Create meeting mirror",
    },
    prepare: {
      pageTitle: "Conversation prep",
      eyebrow: "Before the conversation",
      heading: "Prepare for the person, not only the presentation.",
      description:
        "Bring what you know, what remains unresolved, and the outcome you need. Reasona will help you plan a clearer, more human customer conversation.",
      goalLabel: "What should the next meeting achieve?",
      goalPlaceholder: "Describe the outcome you need and what the customer should leave understanding.",
      contextLabel: "Customer context",
      contextOptional: false,
      outputTitle: "Your conversation brief will appear here",
      outputCopy:
        "Reasona will organise customer priorities, assumptions to test, questions to ask, evidence to bring, and a recommended approach.",
      submit: "Build preparation brief",
    },
  };

  const examples = {
    reflect: {
      title: "Responsible AI discovery with Contoso Council",
      goal:
        "Explain the technical architecture of our AI assistant and gain agreement to start a four-week proof of concept.",
      context:
        "Public-sector customer exploring an employee-facing AI assistant. Their programme lead and information governance lead attended. A previous call raised a general question about adoption.",
      transcript: `Alex (Solution Architect): Today I want to walk through the retrieval architecture, model choice, and how we can stand up a proof of concept.

Priya (Programme Lead): Before the architecture, how would employees know when the assistant is wrong?

Alex: We use retrieval grounding and can show citations. The service runs in our Azure tenant with private networking.

Sam (Information Governance): Who is accountable if a member of staff acts on a poor answer?

Alex: The model never makes the final decision. Let me show the data flow because that explains some of the safeguards.

Priya: I understand the flow, but how would this change the employee's day-to-day work? We have teams worried that automation is being done to them.

Alex: The interface is straightforward and adoption is usually high once people see the time saving. The orchestration layer calls the search index here.

Sam: What conversation has happened with the unions? And which interactions are retained?

Alex: Retention can be configured. We would agree that during discovery.

Priya: Could the next session focus on the operating model, employee involvement, and who owns the risk? I do not think we are ready to agree a proof of concept today.

Alex: Yes, we can bring our responsible AI lead and a draft governance model.

Sam: Please also send the proposed retention options and an example impact assessment before that session.

Alex: Agreed. We will send those by Friday and propose dates for a governance workshop.`,
    },
    prepare: {
      title: "Governance follow-up with Contoso Council",
      goal:
        "Rebuild confidence, agree the decision-making path, and confirm whether a co-designed proof of concept is appropriate.",
      context:
        "Public-sector customer considering an employee-facing AI assistant. Attendees include the programme lead, information governance lead, and employee engagement lead.",
      previousNotes:
        "The first meeting was intended to cover architecture, but questions centred on accountability, employee impact, retention, and governance. The customer asked for a governance-focused follow-up. We committed to bring a responsible AI lead, a draft governance model, retention options, and an example impact assessment.",
      concerns:
        "Who is accountable for poor guidance; how employees and unions are involved; what interaction data is retained; whether the proof of concept would create momentum before governance is agreed.",
    },
  };

  const loadingMessages = {
    reflect: [
      "Separating evidence from interpretation...",
      "Comparing intention with the observed conversation...",
      "Tracing questions, concerns, and commitments...",
      "Building the next-conversation playbook...",
    ],
    prepare: [
      "Organising known facts and assumptions...",
      "Identifying questions that need testing...",
      "Shaping a customer-centred approach...",
      "Building the preparation brief...",
    ],
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function append(parent, ...children) {
    children.filter(Boolean).forEach((child) => parent.append(child));
    return parent;
  }

  function setMode(mode) {
    if (mode !== "reflect" && mode !== "prepare") return;
    state.mode = mode;
    const modeCopy = copy[mode];

    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    reflectFields.hidden = mode !== "reflect";
    prepareFields.hidden = mode !== "prepare";
    transcript.required = mode === "reflect";
    contextInput.required = mode === "prepare";

    document.querySelector("#page-title").textContent = modeCopy.pageTitle;
    document.querySelector("#mode-eyebrow").textContent = modeCopy.eyebrow;
    document.querySelector("#mode-heading").textContent = modeCopy.heading;
    document.querySelector("#mode-description").textContent = modeCopy.description;
    document.querySelector("#goal-label").textContent = modeCopy.goalLabel;
    goalInput.placeholder = modeCopy.goalPlaceholder;
    const contextLabel = document.querySelector("#context-label");
    contextLabel.replaceChildren(document.createTextNode(modeCopy.contextLabel + " "));
    if (modeCopy.contextOptional) {
      contextLabel.append(element("span", "", "Optional"));
    }
    document.querySelector("#empty-title").textContent = modeCopy.outputTitle;
    document.querySelector("#empty-copy").textContent = modeCopy.outputCopy;
    submitLabel.textContent = modeCopy.submit;

    clearOutput();
    clearInvalidFields();
  }

  function updateCharacterCount() {
    const count = transcript.value.length;
    transcriptCount.textContent = `${count.toLocaleString()} / ${maxTranscriptCharacters.toLocaleString()}`;
    transcriptCount.style.color = count > maxTranscriptCharacters * 0.9 ? "#b75a49" : "";
  }

  function clearInvalidFields() {
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
  }

  function validateForm() {
    clearInvalidFields();
    const fields = [titleInput, goalInput, contextInput];
    if (state.mode === "reflect") fields.push(transcript);
    let firstInvalid = null;

    fields.forEach((field) => {
      if (!field.required && !field.value.trim()) return;
      if (!field.checkValidity() || !field.value.trim()) {
        field.setAttribute("aria-invalid", "true");
        firstInvalid ||= field;
      }
    });

    if (state.mode === "reflect" && transcript.value.trim().length < 80) {
      transcript.setAttribute("aria-invalid", "true");
      firstInvalid ||= transcript;
    }

    if (state.mode === "prepare" && contextInput.value.trim().length < 20) {
      contextInput.setAttribute("aria-invalid", "true");
      firstInvalid ||= contextInput;
    }

    firstInvalid?.focus();
    return !firstInvalid;
  }

  function buildPayload() {
    if (state.mode === "reflect") {
      return {
        mode: "reflect",
        meetingTitle: titleInput.value.trim(),
        objective: goalInput.value.trim(),
        customerContext: contextInput.value.trim(),
        transcript: transcript.value.trim(),
      };
    }
    return {
      mode: "prepare",
      meetingTitle: titleInput.value.trim(),
      meetingGoal: goalInput.value.trim(),
      customerContext: contextInput.value.trim(),
      previousNotes: previousNotes.value.trim(),
      knownConcerns: knownConcerns.value.trim(),
    };
  }

  function showOnly(target) {
    [emptyState, loadingState, errorState, analysisResult].forEach((node) => {
      node.hidden = node !== target;
    });
  }

  function clearOutput() {
    stopLoadingMessages();
    state.lastResponse = null;
    analysisResult.replaceChildren();
    resultActions.hidden = true;
    showOnly(emptyState);
  }

  function startLoadingMessages() {
    stopLoadingMessages();
    const messages = loadingMessages[state.mode];
    let index = 0;
    const messageNode = document.querySelector("#loading-message");
    messageNode.textContent = messages[index];
    state.loadingTimer = window.setInterval(() => {
      index = (index + 1) % messages.length;
      messageNode.textContent = messages[index];
    }, 2600);
  }

  function stopLoadingMessages() {
    if (state.loadingTimer) {
      window.clearInterval(state.loadingTimer);
      state.loadingTimer = null;
    }
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    if (loading) {
      showOnly(loadingState);
      resultActions.hidden = true;
      startLoadingMessages();
    } else {
      stopLoadingMessages();
    }
  }

  function showError(message, hint) {
    document.querySelector("#error-message").textContent =
      message || "Reasona could not complete this analysis.";
    const hintNode = document.querySelector("#error-hint");
    hintNode.textContent = hint || "Check the information and try again.";
    hintNode.hidden = !hintNode.textContent;
    showOnly(errorState);
  }

  function list(items, ordered = false) {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    const node = element(ordered ? "ol" : "ul", ordered ? "number-list" : "plain-list");
    if (!values.length) {
      append(node, element("li", "empty-list", "No explicit evidence identified."));
      return node;
    }
    values.forEach((item) => append(node, element("li", "", item)));
    return node;
  }

  function section(title, detail) {
    const wrapper = element("section", "result-section");
    const heading = element("div", "result-section__heading");
    append(heading, element("h4", "", title), detail ? element("span", "", detail) : null);
    append(wrapper, heading);
    return wrapper;
  }

  function signalCard(title, items) {
    const card = element("div", "signal-card");
    append(card, element("p", "signal-card__title", title), list(items));
    return card;
  }

  function playbookBlock(label, content, className = "") {
    const block = element("div", `playbook-block ${className}`.trim());
    append(block, element("span", "", label));
    if (Array.isArray(content)) {
      append(block, list(content));
    } else {
      append(block, element("p", "", content));
    }
    return block;
  }

  function renderMetadata(response) {
    const meta = element("div", "result-meta");
    const generated = new Date(response.metadata.generatedAt);
    append(
      meta,
      element("span", "", `${response.metadata.agentName} · v${response.metadata.agentVersion}`),
      element(
        "span",
        "",
        Number.isNaN(generated.valueOf())
          ? response.metadata.generatedAt
          : generated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      ),
    );
    return meta;
  }

  function renderReflection(response) {
    const result = response.result;
    const fragment = document.createDocumentFragment();
    append(fragment, renderMetadata(response));

    const mirror = element("section", "mirror-card");
    const mirrorTop = element("div", "mirror-card__topline");
    append(
      mirrorTop,
      element("p", "result-eyebrow", "Meeting mirror"),
      element("span", "alignment-badge", result.meetingMirror.alignment),
    );
    const comparison = element("div", "mirror-comparison");
    const intended = element("div");
    append(
      intended,
      element("span", "", "You intended"),
      element("p", "", result.meetingMirror.intendedConversation),
    );
    const observed = element("div");
    append(
      observed,
      element("span", "", "The conversation centred on"),
      element("p", "", result.meetingMirror.observedConversation),
    );
    append(comparison, intended, observed);
    append(
      mirror,
      mirrorTop,
      element("h4", "", result.meetingMirror.headline),
      comparison,
      element("p", "mirror-explanation", result.meetingMirror.explanation),
    );
    append(fragment, mirror, element("p", "result-summary", result.executiveSummary));

    const journeySection = section("Topic journey", "How the discussion moved");
    const journey = element("div", "topic-journey");
    result.topicJourney.forEach((topic, index) => {
      if (index) append(journey, element("i"));
      append(journey, element("span", "", topic));
    });
    append(journeySection, journey);
    append(fragment, journeySection);

    const signals = section("Conversation signals", "Explicit evidence");
    const signalGrid = element("div", "signal-grid");
    append(
      signalGrid,
      signalCard("Repeated questions", result.repeatedQuestions),
      signalCard("Explicit concerns", result.explicitConcerns),
      signalCard("Commitments", result.commitments),
      signalCard("Still unresolved", result.unresolvedQuestions),
    );
    append(signals, signalGrid);
    append(fragment, signals);

    const insightsSection = section("Evidence-backed insights", "What happened → what next");
    const insightStack = element("div", "insight-stack");
    result.insights.forEach((insight) => {
      const card = element("article", "insight-card");
      const header = element("div", "insight-card__header");
      append(
        header,
        element("h5", "", insight.title),
        element(
          "span",
          `confidence confidence--${insight.confidence}`,
          `${insight.confidence} evidence`,
        ),
      );
      const flow = element("div", "evidence-flow");
      [
        ["What happened", insight.whatHappened],
        ["Evidence", insight.evidence],
        ["Why it may matter", insight.whyItMayMatter],
        ["What to do next", insight.whatToDoNext],
      ].forEach(([label, value]) => {
        const item = element("div");
        append(item, element("span", "", label), element("p", "", value));
        append(flow, item);
      });
      append(card, header, flow);
      append(insightStack, card);
    });
    append(insightsSection, insightStack);
    append(fragment, insightsSection);

    if (result.psychologyContext.length) {
      const psychologySection = section("Human context", "Interpretation, not diagnosis");
      const stack = element("div", "psychology-stack");
      result.psychologyContext.forEach((item) => {
        const card = element("article", "psychology-card");
        append(
          card,
          element("h5", "", item.lens),
          element("p", "", item.observablePattern),
          element("p", "", item.whyRelevant),
          element("small", "", item.caution),
        );
        append(stack, card);
      });
      append(psychologySection, stack);
      append(fragment, psychologySection);
    }

    const playbookSection = section("Next conversation playbook", "Turn insight into action");
    const playbook = element("div", "playbook");
    const playbookGrid = element("div", "playbook-grid");
    append(
      playbookGrid,
      playbookBlock("Clarify next", result.playbook.clarifyNext),
      playbookBlock("Evidence to bring", result.playbook.evidenceToBring),
      playbookBlock("Simplify", result.playbook.simplify),
      playbookBlock("Follow-ups", result.playbook.followUps),
    );
    append(
      playbook,
      playbookBlock("Lead with", result.playbook.leadWith, "playbook-block--lead"),
      playbookBlock("Questions to ask", result.playbook.questionsToAsk),
      playbookGrid,
      playbookBlock("Suggested next step", result.playbook.suggestedNextStep),
    );
    append(playbookSection, playbook);
    append(
      fragment,
      playbookSection,
      element("p", "responsible-note", result.responsibleUseNote),
    );
    return fragment;
  }

  function prepPanel(label, content) {
    const panel = element("div", "prep-panel");
    append(panel, element("span", "", label));
    if (Array.isArray(content)) append(panel, list(content));
    else append(panel, element("p", "", content));
    return panel;
  }

  function renderPreparation(response) {
    const result = response.result;
    const fragment = document.createDocumentFragment();
    append(fragment, renderMetadata(response));

    const hero = element("section", "prep-hero");
    append(
      hero,
      element("p", "result-eyebrow", "Preparation brief"),
      element("h4", "", result.executiveSummary),
    );
    append(fragment, hero);

    const priorities = section("Enter with a clear hypothesis", "Test, do not assume");
    const priorityGrid = element("div", "prep-grid");
    append(
      priorityGrid,
      prepPanel("Likely priorities", result.customerPriorities),
      prepPanel("Assumptions to test", result.assumptionsToTest),
    );
    append(priorities, priorityGrid);
    append(fragment, priorities);

    const approach = section("Recommended approach", "How to shape the conversation");
    append(
      approach,
      prepPanel("Conversation structure", result.recommendedApproach),
      element("blockquote", "opening-quote", `“${result.suggestedOpening}”`),
    );
    append(fragment, approach);

    const questions = section("Questions worth asking", "Listen before explaining");
    append(questions, list(result.questionsToAsk, true));
    append(fragment, questions);

    const preparation = section("What to bring", "Evidence and clarity");
    const prepGrid = element("div", "prep-grid");
    append(
      prepGrid,
      prepPanel("Evidence to bring", result.evidenceToBring),
      prepPanel("Communication watchouts", result.communicationWatchouts),
    );
    append(preparation, prepGrid);
    append(fragment, preparation);

    if (result.researchToComplete.length) {
      const research = section("Research to complete", "Before the meeting");
      const researchStack = element("div", "research-stack");
      result.researchToComplete.forEach((item) => {
        const card = element("article", "research-card");
        append(
          card,
          element("h5", "", item.topic),
          element("p", "", item.whyItMatters),
          element("p", "", `Evidence to find: ${item.evidenceToFind}`),
        );
        append(researchStack, card);
      });
      append(research, researchStack);
      append(fragment, research);
    }

    const outcomes = section("A useful meeting would achieve", "Success signals");
    append(outcomes, list(result.successOutcomes, true));
    append(
      fragment,
      outcomes,
      element("p", "responsible-note", result.responsibleUseNote),
    );
    return fragment;
  }

  function renderResponse(response) {
    state.lastResponse = response;
    analysisResult.replaceChildren(
      response.mode === "reflect" ? renderReflection(response) : renderPreparation(response),
    );
    resultActions.hidden = false;
    showOnly(analysisResult);
    analysisResult.focus({ preventScroll: true });
    analysisResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitAnalysis() {
    if (!validateForm()) {
      showError(
        "A little more context is needed.",
        state.mode === "reflect"
          ? "Add a meeting name, objective, and at least 80 characters of transcript."
          : "Add a meeting name, goal, and enough customer context to prepare responsibly.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;
      if (!response.ok) {
        throw {
          message: payload?.error?.message || `The service returned HTTP ${response.status}.`,
          hint: payload?.error?.hint || "Try again or check the server logs for details.",
        };
      }
      renderResponse(payload);
    } catch (error) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Reasona could not complete this analysis.";
      const hint =
        typeof error?.hint === "string"
          ? error.hint
          : "Check that the app is running and can reach Microsoft Foundry.";
      showError(message, hint);
    } finally {
      setLoading(false);
    }
  }

  function setVisionTab(tabName, { focus = false } = {}) {
    visionTabButtons.forEach((button) => {
      const isActive = button.dataset.visionTab === tabName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      if (isActive && focus) {
        button.focus();
      }
    });
    visionTabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.visionPanel !== tabName;
    });
  }

  function showVisionState(target) {
    [visionResultEmpty, visionResultLoading, visionResultError, visionResult].forEach((node) => {
      node.hidden = node !== target;
    });
    visionReportReady.hidden = ![visionResult, visionResultError].includes(target);
  }

  function clearVisionResult() {
    state.camera.contextNote = null;
    state.camera.latestResult = null;
    state.camera.report = {
      analyzedFrames: 0,
      postureAndPosition: [],
      headOrientation: [],
      visibleGestures: [],
      environmentObservations: [],
      practicalSuggestions: [],
    };
    document.querySelector("#vision-frame-count").textContent = "0";
    document.querySelector("#use-vision-context").disabled = false;
    document.querySelector("#use-vision-context").textContent =
      "Add safe note to customer context";
    visionReportReady.hidden = true;
    showVisionState(visionResultEmpty);
  }

  function updateFaceStatus(count, label) {
    state.camera.faceCount = count;
    faceStatus.classList.toggle("is-live", Number.isInteger(count));
    if (label) {
      faceStatus.textContent = label;
      return;
    }
    if (!Number.isInteger(count)) {
      faceStatus.textContent = "Detecting faces...";
      return;
    }
    faceStatus.textContent = `${count} ${count === 1 ? "face" : "faces"} visible`;
  }

  function clearFaceOverlay() {
    const context = faceOverlay.getContext("2d");
    context?.clearRect(0, 0, faceOverlay.width, faceOverlay.height);
  }

  function drawFaceBoxes(boxes) {
    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;
    if (!width || !height) return;

    if (faceOverlay.width !== width || faceOverlay.height !== height) {
      faceOverlay.width = width;
      faceOverlay.height = height;
    }

    const context = faceOverlay.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--cp-accent")
      .trim();
    context.lineWidth = Math.max(3, Math.round(width / 320));

    boxes.forEach((box) => {
      const x = Number(box.originX ?? box.x ?? 0);
      const y = Number(box.originY ?? box.y ?? 0);
      const boxWidth = Number(box.width ?? 0);
      const boxHeight = Number(box.height ?? 0);
      context.strokeRect(x, y, boxWidth, boxHeight);
    });
  }

  async function createOnDeviceFaceDetector() {
    if ("FaceDetector" in window) {
      try {
        const nativeDetector = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 20,
        });
        return {
          async detect(video) {
            const faces = await nativeDetector.detect(video);
            return faces.map((face) => face.boundingBox);
          },
          close() {},
        };
      } catch {
        // Fall through to MediaPipe when the browser advertises but cannot start its detector.
      }
    }

    const visionModule = await import(MEDIAPIPE_MODULE_URL);
    const fileset = await visionModule.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const mediaPipeDetector = await visionModule.FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: FACE_DETECTOR_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.55,
    });

    return {
      async detect(video, timestamp) {
        const result = await mediaPipeDetector.detectForVideo(video, timestamp);
        return result.detections
          .map((detection) => detection.boundingBox)
          .filter(Boolean);
      },
      close() {
        mediaPipeDetector.close();
      },
    };
  }

  async function runFaceDetection(timestamp) {
    if (!state.camera.stream || !state.camera.detector) return;

    const shouldDetect =
      cameraVideo.readyState >= 2 &&
      !state.camera.detectionPending &&
      timestamp - state.camera.lastDetectionAt >= 120;

    if (shouldDetect) {
      state.camera.detectionPending = true;
      state.camera.lastDetectionAt = timestamp;
      try {
        const boxes = await state.camera.detector.detect(cameraVideo, timestamp);
        if (!state.camera.stream) return;
        drawFaceBoxes(boxes);
        updateFaceStatus(boxes.length);
      } catch (error) {
        console.error("On-device face detection stopped", error);
        clearFaceOverlay();
        state.camera.detector?.close();
        state.camera.detector = null;
        updateFaceStatus(null, "Detector unavailable");
        cameraMessage.textContent =
          "The live video remains private, but face boxes could not run.";
      } finally {
        state.camera.detectionPending = false;
      }
    }

    if (state.camera.stream) {
      state.camera.animationFrame = window.requestAnimationFrame(runFaceDetection);
    }
  }

  function setLiveAnalysisUi(enabled, statusMessage) {
    toggleLiveAnalysisButton.textContent = enabled
      ? "Stop live analysis"
      : "Start live analysis";
    liveAnalysisIndicator.classList.toggle("is-live", enabled);
    liveAnalysisStatus.classList.toggle("is-live", enabled);
    liveAnalysisStatus.textContent =
      statusMessage ||
      (enabled
        ? "Live · sampling one video frame every second"
        : "Off · no frames are being sent");
  }

  function stopLiveAnalysis(statusMessage = "Off · no frames are being sent") {
    state.camera.liveAnalysisEnabled = false;
    if (state.camera.liveAnalysisTimer) {
      window.clearInterval(state.camera.liveAnalysisTimer);
      state.camera.liveAnalysisTimer = null;
    }
    state.camera.liveAnalysisControllers.forEach((controller) => controller.abort());
    state.camera.liveAnalysisControllers.clear();
    setLiveAnalysisUi(false, statusMessage);
    toggleLiveAnalysisButton.disabled =
      !state.camera.stream || !liveAnalysisConsent.checked;
  }

  async function runLiveAnalysisCycle() {
    if (
      !state.camera.liveAnalysisEnabled ||
      !state.camera.stream
    ) {
      return;
    }

    if (state.camera.liveAnalysisControllers.size >= 3) {
      liveAnalysisStatus.textContent =
        "Live · Foundry is catching up; the next frame will retry in one second";
      return;
    }

    const sequence = ++state.camera.liveAnalysisSequence;
    liveAnalysisStatus.textContent = `Live · sending frame ${sequence} to Foundry...`;
    if (visionResult.hidden) {
      showVisionState(visionResultLoading);
    }

    let controller = null;
    try {
      const imageDataUrl = captureCurrentFrame({ maxWidth: 640, quality: 0.72 });
      if (!imageDataUrl) {
        throw {
          message: "The live camera frame was not ready.",
          hint: "Keep the camera open and start live analysis again.",
        };
      }

      controller = new AbortController();
      state.camera.liveAnalysisControllers.add(controller);
      const payload = await requestVisionAnalysis(
        imageDataUrl,
        state.camera.faceCount,
        controller.signal,
      );
      if (!state.camera.liveAnalysisEnabled) return;

      if (sequence >= state.camera.latestVisionSequence) {
        state.camera.latestVisionSequence = sequence;
        renderVisionAnalysis(payload);
        const updatedAt = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLiveAnalysisUi(
          true,
          `Live · frame ${sequence} updated ${updatedAt} · sampling every second`,
        );
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      document.querySelector("#vision-error-message").textContent =
        typeof error?.message === "string"
          ? error.message
          : "Reasona could not analyze the live camera frame.";
      document.querySelector("#vision-error-hint").textContent =
        typeof error?.hint === "string"
          ? error.hint
          : "Check the Foundry connection and start live analysis again.";
      showVisionState(visionResultError);
      stopLiveAnalysis("Stopped · live analysis encountered an error");
    } finally {
      if (controller) {
        state.camera.liveAnalysisControllers.delete(controller);
      }
    }
  }

  function startLiveAnalysis() {
    if (
      !state.camera.stream ||
      !liveAnalysisConsent.checked ||
      state.camera.liveAnalysisEnabled
    ) {
      return;
    }

    state.camera.liveAnalysisEnabled = true;
    state.camera.liveAnalysisSequence = 0;
    state.camera.latestVisionSequence = 0;
    setLiveAnalysisUi(true, "Live · preparing the first Foundry observation...");
    runLiveAnalysisCycle();
    state.camera.liveAnalysisTimer = window.setInterval(runLiveAnalysisCycle, 1000);
  }

  function stopLiveCamera() {
    stopLiveAnalysis();
    if (state.camera.animationFrame) {
      window.cancelAnimationFrame(state.camera.animationFrame);
      state.camera.animationFrame = null;
    }
    state.camera.stream?.getTracks().forEach((track) => track.stop());
    state.camera.stream = null;
    cameraVideo.srcObject = null;
    state.camera.detectionPending = false;
    clearFaceOverlay();

    state.camera.detector?.close();
    state.camera.detector = null;
    toggleLiveAnalysisButton.disabled = true;
  }

  function resetCameraWorkspace() {
    stopLiveCamera();
    cameraVideo.hidden = true;
    faceOverlay.hidden = true;
    cameraPlaceholder.hidden = false;
    startCameraButton.hidden = false;
    startCameraButton.disabled = false;
    stopCameraButton.hidden = true;
    liveAnalysisConsent.checked = false;
    toggleLiveAnalysisButton.disabled = true;
    setLiveAnalysisUi(false);
    updateFaceStatus(null, "Camera off");
    cameraMessage.textContent =
      "Video frames stay private until live analysis is enabled.";
    clearVisionResult();
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateFaceStatus(null, "Camera unavailable");
      cameraMessage.textContent =
        "This browser does not provide secure camera access. Try a current browser on localhost or HTTPS.";
      return;
    }

    startCameraButton.disabled = true;
    clearVisionResult();
    cameraMessage.textContent = "Requesting camera permission...";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      state.camera.stream = stream;
      cameraVideo.srcObject = stream;
      await cameraVideo.play();

      cameraPlaceholder.hidden = true;
      cameraVideo.hidden = false;
      faceOverlay.hidden = false;
      startCameraButton.hidden = true;
      stopCameraButton.hidden = false;
      toggleLiveAnalysisButton.disabled = !liveAnalysisConsent.checked;
      updateFaceStatus(null);
      cameraMessage.textContent =
        "Loading the on-device detector. Live frames are not uploaded.";

      if (!state.camera.detector) {
        state.camera.detector = await createOnDeviceFaceDetector();
      }
      if (!state.camera.stream) {
        state.camera.detector.close();
        state.camera.detector = null;
        return;
      }
      cameraMessage.textContent =
        "Face boxes and counts run on this device. They do not identify anyone.";
      state.camera.animationFrame = window.requestAnimationFrame(runFaceDetection);
    } catch (error) {
      console.error("Camera start failed", error);
      stopLiveCamera();
      cameraVideo.hidden = true;
      faceOverlay.hidden = true;
      cameraPlaceholder.hidden = false;
      startCameraButton.hidden = false;
      stopCameraButton.hidden = true;
      updateFaceStatus(null, "Permission needed");
      cameraMessage.textContent =
        error?.name === "NotAllowedError"
          ? "Camera permission was not granted. Live video did not start."
          : "The camera could not start. Check that another application is not using it.";
    } finally {
      startCameraButton.disabled = false;
    }
  }

  function captureCurrentFrame({ maxWidth, quality }) {
    const sourceWidth = cameraVideo.videoWidth;
    const sourceHeight = cameraVideo.videoHeight;
    if (!state.camera.stream || !sourceWidth || !sourceHeight) {
      return null;
    }

    const targetWidth = Math.min(sourceWidth, maxWidth);
    const targetHeight = Math.round((sourceHeight / sourceWidth) * targetWidth);
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;
    const context = captureCanvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.translate(targetWidth, 0);
    context.scale(-1, 1);
    context.drawImage(cameraVideo, 0, 0, targetWidth, targetHeight);
    return captureCanvas.toDataURL("image/jpeg", quality);
  }

  function stopCamera() {
    resetCameraWorkspace();
  }

  function fillVisionList(selector, items) {
    const target = document.querySelector(selector);
    const values = Array.isArray(items) && items.length ? items : ["Nothing notable observed."];
    target.replaceChildren(...values.map((item) => element("li", "", item)));
  }

  function mergeVisionItems(currentItems, ...newItemGroups) {
    const mergedItems = [...currentItems];
    newItemGroups.flat().forEach((item) => {
      const normalizedItem = typeof item === "string" ? item.trim() : "";
      if (normalizedItem && !mergedItems.includes(normalizedItem)) {
        mergedItems.push(normalizedItem);
      }
    });
    return mergedItems.slice(-12);
  }

  function renderVisionAnalysis(payload, { openReport = false } = {}) {
    const result = payload.result;
    const report = state.camera.report;
    report.analyzedFrames += 1;
    report.postureAndPosition = mergeVisionItems(
      report.postureAndPosition,
      result.postureAndPosition,
    );
    report.headOrientation = mergeVisionItems(
      report.headOrientation,
      result.headOrientation,
    );
    report.visibleGestures = mergeVisionItems(
      report.visibleGestures,
      result.visibleGestures,
    );
    report.environmentObservations = mergeVisionItems(
      report.environmentObservations,
      result.faceVisibility,
      result.lightingObservations,
      result.visibleContext,
    );
    report.practicalSuggestions = mergeVisionItems(
      report.practicalSuggestions,
      result.practicalSuggestions,
    );
    state.camera.contextNote = result.conversationContextNote;
    state.camera.latestResult = result;
    document.querySelector("#vision-summary").textContent = result.summary;
    document.querySelector("#vision-face-count").textContent = result.visibleFaces;
    document.querySelector("#vision-frame-count").textContent = report.analyzedFrames;
    document.querySelector("#vision-framing-badge").textContent =
      `${result.framingQuality} framing`;
    document.querySelector("#vision-limitations").textContent = result.limitationsNote;
    fillVisionList("#vision-posture", report.postureAndPosition);
    fillVisionList("#vision-head-orientation", report.headOrientation);
    fillVisionList("#vision-gestures", report.visibleGestures);
    fillVisionList("#vision-environment", report.environmentObservations);
    fillVisionList("#vision-suggestions", report.practicalSuggestions);
    showVisionState(visionResult);
    if (openReport) {
      setVisionTab("report");
      visionResult.focus({ preventScroll: true });
    }
  }

  async function requestVisionAnalysis(imageDataUrl, detectedFaceCount, signal) {
    const response = await fetch("/api/vision/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        consentConfirmed: true,
        detectedFaceCount: Number.isInteger(detectedFaceCount)
          ? detectedFaceCount
          : null,
      }),
      signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) {
      throw {
        message: payload?.error?.message || `The service returned HTTP ${response.status}.`,
        hint: payload?.error?.hint || "Check the approved visual input and try again.",
      };
    }
    return payload;
  }

  function addVisionContext() {
    if (!state.camera.contextNote) return;
    const prefix = contextInput.value.trim() ? "\n\n" : "";
    const addition = `Visual context (approved camera frame): ${state.camera.contextNote}`;
    const updatedContext = `${contextInput.value.trim()}${prefix}${addition}`;
    if (updatedContext.length > Number(contextInput.maxLength)) {
      cameraMessage.textContent =
        "The safe visual note would exceed the customer context limit. Shorten the existing context first.";
      return;
    }

    contextInput.value = updatedContext;
    const button = document.querySelector("#use-vision-context");
    button.textContent = "Added to customer context";
    button.disabled = true;
    cameraMessage.textContent =
      "A non-sensitive visual note was added. No video frame was added.";
  }

  function downloadVisionReport() {
    if (!state.camera.latestResult || !state.camera.report.analyzedFrames) return;
    const latestResult = state.camera.latestResult;
    const report = {
      generatedAt: new Date().toISOString(),
      reportType: "observable-camera-cues",
      framesAnalyzed: state.camera.report.analyzedFrames,
      summary: latestResult.summary,
      latestFrame: {
        visibleFaces: latestResult.visibleFaces,
        framingQuality: latestResult.framingQuality,
      },
      observableCues: {
        postureAndPosition: state.camera.report.postureAndPosition,
        headOrientation: state.camera.report.headOrientation,
        visibleGestures: state.camera.report.visibleGestures,
        environmentAndFraming: state.camera.report.environmentObservations,
      },
      practicalSuggestions: state.camera.report.practicalSuggestions,
      limitations: latestResult.limitationsNote,
      safetyNote:
        "This report contains observable visual cues only. It does not infer sentiment, emotion, intent, attention, engagement, personality, or identity.",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reasona-camera-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function openCameraDialog() {
    if (!visionDialog.open) {
      visionDialog.showModal();
      setVisionTab("camera");
      await startCamera();
    }
  }

  function closeCameraDialog() {
    resetCameraWorkspace();
    setVisionTab("camera");
    visionDialog.close();
  }

  function loadExample() {
    const example = examples[state.mode];
    titleInput.value = example.title;
    goalInput.value = example.goal;
    contextInput.value = example.context;
    if (state.mode === "reflect") {
      transcript.value = example.transcript;
      updateCharacterCount();
    } else {
      previousNotes.value = example.previousNotes;
      knownConcerns.value = example.concerns;
    }
    clearInvalidFields();
    titleInput.focus();
  }

  function downloadResult() {
    if (!state.lastResponse) return;
    const title = titleInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob([JSON.stringify(state.lastResponse, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reasona-${title || state.mode}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  transcript.addEventListener("input", updateCharacterCount);
  document.querySelector("#load-example").addEventListener("click", loadExample);
  document.querySelector("#retry-analysis").addEventListener("click", submitAnalysis);
  document.querySelector("#download-result").addEventListener("click", downloadResult);
  document.querySelector("#print-result").addEventListener("click", () => window.print());
  document.querySelector("#open-camera").addEventListener("click", openCameraDialog);
  document.querySelector("#close-camera").addEventListener("click", closeCameraDialog);
  visionTabButtons.forEach((button, index) => {
    button.addEventListener("click", () => setVisionTab(button.dataset.visionTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (index + direction + visionTabButtons.length) % visionTabButtons.length;
      setVisionTab(visionTabButtons[nextIndex].dataset.visionTab, { focus: true });
    });
  });
  startCameraButton.addEventListener("click", startCamera);
  stopCameraButton.addEventListener("click", stopCamera);
  toggleLiveAnalysisButton.addEventListener("click", () => {
    if (state.camera.liveAnalysisEnabled) {
      stopLiveAnalysis();
    } else {
      startLiveAnalysis();
    }
  });
  liveAnalysisConsent.addEventListener("change", () => {
    if (!liveAnalysisConsent.checked) {
      stopLiveAnalysis("Stopped · consent was withdrawn");
      return;
    }
    toggleLiveAnalysisButton.disabled = !state.camera.stream;
  });
  document
    .querySelector("#download-vision-report")
    .addEventListener("click", downloadVisionReport);
  document.querySelector("#use-vision-context").addEventListener("click", addVisionContext);
  visionDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCameraDialog();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.camera.liveAnalysisEnabled) {
      stopLiveAnalysis("Paused · tab is not visible");
    }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnalysis();
  });

  setMode("reflect");
  updateCharacterCount();
})();
