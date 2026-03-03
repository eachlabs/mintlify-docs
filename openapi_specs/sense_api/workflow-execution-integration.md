# Workflow Creation & Execution — Frontend Integration Guide

**New in /chat endpoint:** The AI agent can now automatically **create**, **trigger**, and **monitor** workflows for complex multi-step generation tasks (multi-scene videos, character-consistent content). This happens through `/chat` — no new endpoints required.

---

## Table of Contents

- [Overview](#overview)
- [When Does This Trigger?](#when-does-this-trigger)
- [Multi-Turn Flow](#multi-turn-flow)
  - [Turn 1: Workflow Creation](#turn-1-workflow-creation)
  - [Turn 2: Workflow Execution](#turn-2-workflow-execution)
- [New SSE Event Types](#new-sse-event-types)
  - [workflow_created](#workflow_created)
  - [clarification_needed (updated)](#clarification_needed-updated)
  - [execution_started](#execution_started)
  - [execution_progress](#execution_progress)
  - [execution_completed](#execution_completed)
- [Non-Streaming Response Changes](#non-streaming-response-changes)
- [Fetching Workflow Details (Eachlabs API)](#fetching-workflow-details-eachlabs-api)
- [Complete Use Case Flows](#complete-use-case-flows)
  - [Flow: Multi-Scene Character-Consistent Video](#flow-multi-scene-character-consistent-video)
  - [Flow: Complex Pipeline (Generate + Edit + Animate + Merge)](#flow-complex-pipeline)
- [Frontend Implementation Guide](#frontend-implementation-guide)
  - [State Management](#state-management)
  - [Event Handling Decision Tree](#event-handling-decision-tree)
  - [React Hook Extension](#react-hook-extension)
  - [Step-by-Step Progress UI](#step-by-step-progress-ui)
- [Existing Flows Not Affected](#existing-flows-not-affected)

---

## Overview

Three new tools are available to the AI agent inside `/chat`:

| Tool | Type | Purpose |
|------|------|---------|
| `create_workflow` | Non-terminal | Creates a new workflow via Eachlabs API, returns `workflow_id` |
| `trigger_workflow` | Non-terminal | Triggers execution of a created workflow with user inputs |
| `check_execution` | Terminal | Polls execution status every 5s (up to 15 min), streams per-step progress |

These tools are used **automatically** by the agent when the request needs multi-step generation with consistency (e.g., same character across scenes). Simple requests still use `execute_model` directly.

---

## When Does This Trigger?

The agent decides based on the request:

| Request Type | Agent Behavior |
|---|---|
| Single image/video | `execute_model` (direct, same as before) |
| Multiple **unrelated** images | Multiple `execute_model` calls (same as before) |
| Multi-scene with **same character** | `create_workflow` (new) |
| Complex pipeline (generate + edit + animate + merge) | `create_workflow` (new) |
| Workflow update (when `workflow_id` is passed) | `build_workflow` (existing) |

**Keywords that trigger workflow creation:** "same character", "character consistency", "multi-scene", "short movie", "story with same person", "consistent look across scenes".

---

## Multi-Turn Flow

### Turn 1: Workflow Creation

The agent creates a workflow and asks the user for input values.

```
POST /chat
{
  "message": "Create a 3-scene short movie about a robot learning to dance",
  "stream": true,
  "session_id": "movie-session-1"
}
```

**SSE events received:**

```
status          → "Searching for models..."
status          → "Getting model details..."
status          → "Creating workflow..."
workflow_created → { workflow_id: "wf-abc-123", version_id: "v1", input_schema: {...}, steps_count: 6 }
clarification_needed → {
  question: "I've built a 6-step workflow for your robot movie! I need a few details...",
  options: ["Describe the robot's appearance", "What art style?", "Any specific colors?"],
  workflow_id: "wf-abc-123",
  version_id: "v1"
}
complete        → { status: "awaiting_input" }
[DONE]
```

**Frontend should:**
1. Store the `workflow_id` and `version_id` from the `clarification_needed` event
2. Display the clarification question with options
3. Wait for user input

---

### Turn 2: Workflow Execution

The user provides inputs. The frontend sends back the stored `workflow_id`.

```
POST /chat
{
  "message": "A friendly silver robot with blue LED eyes, pixar cartoon style",
  "stream": true,
  "session_id": "movie-session-1",
  "workflow_id": "wf-abc-123",
  "version_id": "v1"
}
```

**SSE events received:**

```
status             → "Starting workflow execution..."
execution_started  → { execution_id: "exec-xyz-789", workflow_id: "wf-abc-123" }
status             → "Workflow running... (0 steps completed)"
execution_progress → { step_id: "step1", step_status: "completed", output: "https://cdn.../ref.png", model: "nano-banana-pro", completed_steps: 1, total_steps: 6 }
execution_progress → { step_id: "step2", step_status: "completed", output: "https://cdn.../scene1.png", model: "nano-banana-pro-edit", completed_steps: 2, total_steps: 6 }
execution_progress → { step_id: "step3", step_status: "completed", output: "https://cdn.../scene2.png", ... completed_steps: 3, total_steps: 6 }
execution_progress → { step_id: "step4", step_status: "completed", output: "https://cdn.../scene1.mp4", ... completed_steps: 4, total_steps: 6 }
execution_progress → { step_id: "step5", step_status: "completed", output: "https://cdn.../scene2.mp4", ... completed_steps: 5, total_steps: 6 }
execution_progress → { step_id: "step6", step_status: "completed", output: "https://cdn.../final.mp4", model: "merge-videos", completed_steps: 6, total_steps: 6 }
execution_completed → { execution_id: "exec-xyz-789", status: "completed", output: "https://cdn.../final.mp4", all_outputs: { step1: "https://...", step2: "https://...", ... } }
generation_response → { url: "https://cdn.../final.mp4", generations: [...], total: 1 }
complete           → { status: "ok", generations: ["https://cdn.../final.mp4"] }
[DONE]
```

**Frontend should:**
1. Show a step-by-step progress tracker (e.g., "Step 2/6 completed")
2. Optionally show intermediate outputs (each step's image/video)
3. Display the final merged video when `execution_completed` arrives

---

## New SSE Event Types

### `workflow_created`

A new workflow has been created via the Eachlabs API. Emitted during Turn 1.

```json
{
  "type": "workflow_created",
  "workflow_id": "wf-abc-123-def-456",
  "version_id": "v1",
  "input_schema": {
    "properties": {
      "character_description": { "type": "string", "required": true, "default_value": "" },
      "style": { "type": "string", "required": true, "default_value": "cartoon" },
      "type": "object"
    }
  },
  "steps_count": 6
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workflow_id` | `string` | UUID of the newly created workflow |
| `version_id` | `string` | Version identifier (usually `"v1"`) |
| `input_schema` | `object` | Input fields the workflow expects from the user |
| `steps_count` | `number` | Number of steps in the workflow pipeline |

**Frontend handling:** Store `workflow_id` and `version_id`. Can optionally display the workflow structure or a "Workflow created" notification. The `input_schema` tells you what fields the user needs to provide.

---

### `clarification_needed` (updated)

When a workflow was just created, the `clarification_needed` event now includes `workflow_id` and `version_id`. The frontend **must** store these and send them back in the next request.

```json
{
  "type": "clarification_needed",
  "question": "I've built a 6-step workflow! Please provide these details:",
  "options": ["Describe the character", "What art style?"],
  "context": "These inputs will be used across all scenes for consistency.",
  "workflow_id": "wf-abc-123-def-456",
  "version_id": "v1"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The question to display |
| `options` | `string[]` | Suggested options (may be empty) |
| `context` | `string` | Why the info is needed (may be empty) |
| `workflow_id` | `string\|null` | **NEW** — Workflow ID if a workflow was just created. `null` for normal clarifications. |
| `version_id` | `string\|null` | **NEW** — Version ID. `null` for normal clarifications. |

**Frontend handling:**
- If `workflow_id` is present: store it and include it in the next `/chat` request as `workflow_id` and `version_id` fields
- If `workflow_id` is absent: normal clarification flow (same as before, just send reply with same `session_id`)

---

### `execution_started`

A workflow execution has been triggered. The backend will now poll for results.

```json
{
  "type": "execution_started",
  "execution_id": "exec-xyz-789",
  "workflow_id": "wf-abc-123"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `execution_id` | `string` | Unique execution ID |
| `workflow_id` | `string` | The workflow being executed |

**Frontend handling:** Show a "Workflow execution started" indicator. Initialize a step progress tracker. The execution may take several minutes — show an appropriate loading state.

---

### `execution_progress`

A step in the workflow has completed (or failed). Emitted incrementally as each step finishes.

```json
{
  "type": "execution_progress",
  "step_id": "step2",
  "step_status": "completed",
  "output": "https://cdn.eachlabs.ai/generated/scene1.png",
  "model": "nano-banana-pro-edit",
  "completed_steps": 2,
  "total_steps": 6
}
```

| Field | Type | Description |
|-------|------|-------------|
| `step_id` | `string` | Which step completed (e.g., `"step1"`, `"step2"`) |
| `step_status` | `string` | `"completed"` or `"failed"` |
| `output` | `string` | The step's primary output (URL for media, text for LLM) |
| `model` | `string` | Model that ran this step |
| `completed_steps` | `number` | How many steps are done so far |
| `total_steps` | `number` | Total steps in the workflow |

**Frontend handling:**
- Update a progress bar or step tracker: `completed_steps / total_steps`
- Optionally render intermediate outputs (show each generated image/video as it completes)
- If `step_status` is `"failed"`, show which step failed
- Note: steps may complete out of order if the workflow engine runs independent steps in parallel

---

### `execution_completed`

The entire workflow execution is done.

```json
{
  "type": "execution_completed",
  "execution_id": "exec-xyz-789",
  "status": "completed",
  "output": "https://cdn.eachlabs.ai/generated/final-video.mp4",
  "all_outputs": {
    "step1": "https://cdn.eachlabs.ai/generated/ref-image.png",
    "step2": "https://cdn.eachlabs.ai/generated/scene1.png",
    "step3": "https://cdn.eachlabs.ai/generated/scene2.png",
    "step4": "https://cdn.eachlabs.ai/generated/scene1.mp4",
    "step5": "https://cdn.eachlabs.ai/generated/scene2.mp4",
    "step6": "https://cdn.eachlabs.ai/generated/final-video.mp4"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `execution_id` | `string` | Execution identifier |
| `status` | `string` | `"completed"` |
| `output` | `string` | The final step's primary output (the main result) |
| `all_outputs` | `object` | Map of `step_id` → output URL for every step |

**Frontend handling:**
- Display the `output` as the main result (image or video)
- Use `all_outputs` to show a gallery of all intermediate results if desired
- A `generation_response` event will also follow with the final URL

---

## Non-Streaming Response Changes

When `stream: false`, the JSON response includes new fields:

### Clarification with Workflow

```json
{
  "success": true,
  "clarification_needed": true,
  "question": "I've built a workflow! Please provide details...",
  "options": ["..."],
  "context": "...",
  "workflow_id": "wf-abc-123",
  "version_id": "v1"
}
```

`workflow_id` and `version_id` are present only when a workflow was just created.

### Execution Completed

Generated URLs from workflow execution are included in the `generations` array:

```json
{
  "task_id": "chat_123456",
  "status": "ok",
  "generations": [
    "https://cdn.eachlabs.ai/generated/step1.png",
    "https://cdn.eachlabs.ai/generated/step2.mp4",
    "https://cdn.eachlabs.ai/generated/final.mp4"
  ]
}
```

---

## Fetching Workflow Details (Eachlabs API)

After a workflow is created, the frontend can fetch its full definition directly from the Eachlabs Workflows API. This is useful for displaying the workflow structure, input form, or step details.

### GET Workflow

```
GET https://workflows.eachlabs.run/api/v1/workflows/{workflow_id}
X-API-Key: your-api-key
Accept: application/json
```

### Response

```json
{
  "id": "wf-abc-123-def-456",
  "name": "3-Scene Robot Movie",
  "description": "Multi-scene video with character consistency",
  "versions": [
    {
      "version_id": "v1",
      "definition": {
        "version": "v1",
        "input_schema": {
          "properties": {
            "character_description": {
              "type": "string",
              "required": true,
              "default_value": ""
            },
            "style": {
              "type": "string",
              "required": true,
              "default_value": "cartoon"
            },
            "type": "object"
          }
        },
        "steps": [
          {
            "id": "step1",
            "type": "model",
            "model": "nano-banana-pro",
            "version": "0.0.1",
            "params": {
              "prompt": "$.inputs.character_description",
              "aspect_ratio": "1:1"
            }
          },
          {
            "id": "step2",
            "type": "model",
            "model": "nano-banana-pro-edit",
            "version": "0.0.1",
            "params": {
              "prompt": "Scene 1: discovering a glowing portal in $.inputs.style style",
              "image_urls": ["$.step1.primary"]
            }
          }
        ]
      }
    }
  ]
}
```

### When to Fetch

- After receiving a `workflow_created` event — to display the workflow structure and build a dynamic input form
- After receiving a `clarification_needed` event with `workflow_id` — to understand what inputs the workflow needs
- To display step details, model info, or the pipeline visualization

### Building a Dynamic Input Form

Use the `input_schema.properties` from the workflow definition to build a form:

```typescript
interface WorkflowInputField {
  type: "string" | "number" | "boolean" | "image" | "video" | "voice" | "file" | "json_array";
  required: boolean;
  default_value: any;
}

async function fetchWorkflowInputs(workflowId: string, versionId: string, apiKey: string) {
  const response = await fetch(
    `https://workflows.eachlabs.run/api/v1/workflows/${workflowId}`,
    { headers: { "X-API-Key": apiKey, "Accept": "application/json" } }
  );
  const data = await response.json();
  const version = data.versions.find((v: any) => v.version_id === versionId) || data.versions[0];
  const properties = version.definition.input_schema.properties;

  // Filter out the "type" key which is metadata, not an input field
  const inputFields: Record<string, WorkflowInputField> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key !== "type" && typeof value === "object") {
      inputFields[key] = value as WorkflowInputField;
    }
  }
  return inputFields;
}
```

---

## Complete Use Case Flows

### Flow: Multi-Scene Character-Consistent Video

A user requests a multi-scene video where the same character appears in every scene.

**Turn 1 — Workflow Creation:**

```
Request:
POST /chat
{
  "message": "Create a 3-scene animated short about a friendly robot. Scene 1: robot wakes up. Scene 2: robot makes breakfast. Scene 3: robot dances.",
  "stream": true,
  "session_id": "robot-movie"
}

SSE Events:
1.  status            → "Searching for image generation models..."
2.  status            → "Getting details for nano-banana-pro..."
3.  status            → "Getting details for nano-banana-pro-edit..."
4.  status            → "Getting details for veo3-1-image-to-video-fast..."
5.  status            → "Getting details for merge-videos..."
6.  status            → "Creating workflow..."
7.  workflow_created  → {
      workflow_id: "wf-robot-123",
      version_id: "v1",
      input_schema: { properties: { character_description: {...}, style: {...} } },
      steps_count: 7
    }
8.  clarification_needed → {
      question: "I've built a 7-step pipeline for your robot movie! To get started I need:",
      options: ["Describe the robot's appearance", "Art style (cartoon, realistic, anime?)"],
      workflow_id: "wf-robot-123",
      version_id: "v1"
    }
9.  complete          → { status: "awaiting_input" }
10. [DONE]
```

**Turn 2 — Execution:**

```
Request:
POST /chat
{
  "message": "Silver robot with blue LED eyes and antenna, pixar 3D cartoon style",
  "stream": true,
  "session_id": "robot-movie",
  "workflow_id": "wf-robot-123",
  "version_id": "v1"
}

SSE Events:
1.  status              → "Starting workflow execution..."
2.  execution_started   → { execution_id: "exec-456", workflow_id: "wf-robot-123" }
3.  status              → "Workflow running... (0 steps completed)"
4.  execution_progress  → { step_id: "step1", step_status: "completed", output: "https://.../robot-ref.png",
                            model: "nano-banana-pro", completed_steps: 1, total_steps: 7 }
5.  execution_progress  → { step_id: "step2", step_status: "completed", output: "https://.../scene1.png",
                            completed_steps: 2, total_steps: 7 }
6.  execution_progress  → { step_id: "step3", step_status: "completed", output: "https://.../scene2.png",
                            completed_steps: 3, total_steps: 7 }
7.  execution_progress  → { step_id: "step4", step_status: "completed", output: "https://.../scene3.png",
                            completed_steps: 4, total_steps: 7 }
8.  execution_progress  → { step_id: "step5", step_status: "completed", output: "https://.../scene1.mp4",
                            completed_steps: 5, total_steps: 7 }
9.  execution_progress  → { step_id: "step6", step_status: "completed", output: "https://.../scene2.mp4",
                            completed_steps: 6, total_steps: 7 }
10. execution_progress  → { step_id: "step7", step_status: "completed", output: "https://.../final.mp4",
                            model: "merge-videos", completed_steps: 7, total_steps: 7 }
11. execution_completed → {
      execution_id: "exec-456",
      status: "completed",
      output: "https://.../final.mp4",
      all_outputs: { step1: "https://...", step2: "https://...", ... }
    }
12. generation_response → { url: "https://.../final.mp4", generations: ["https://.../final.mp4"], total: 1 }
13. complete            → { status: "ok", generations: ["https://.../final.mp4"] }
14. [DONE]
```

---

### Flow: Complex Pipeline

A request for a complex pipeline (generate image + edit + animate + add voice + merge).

```
Request:
POST /chat
{
  "message": "Create a UGC-style product ad: generate a presenter, make them hold my product, animate with lip-sync, add voiceover",
  "stream": true,
  "session_id": "ugc-pipeline",
  "image_urls": ["https://example.com/product.jpg"]
}

Turn 1 SSE Events:
1.  status            → "Searching for models..."
2-5. (model detail lookups)
6.  workflow_created  → { workflow_id: "wf-ugc-456", steps_count: 5 }
7.  clarification_needed → {
      question: "Pipeline ready! I need some details:",
      options: ["Product name", "Key benefit to highlight", "Target audience"],
      workflow_id: "wf-ugc-456",
      version_id: "v1"
    }
8.  complete → { status: "awaiting_input" }
9.  [DONE]

Turn 2 (user provides details, same session_id, workflow_id):
→ trigger_workflow → check_execution → step-by-step progress → final video
```

---

## Frontend Implementation Guide

### State Management

Add these fields to your chat state:

```typescript
interface WorkflowExecutionState {
  // Workflow creation (Turn 1)
  createdWorkflowId: string | null;
  createdVersionId: string | null;

  // Execution tracking (Turn 2)
  executionId: string | null;
  executionStatus: "idle" | "running" | "completed" | "failed";
  completedSteps: number;
  totalSteps: number;
  stepOutputs: Record<string, { status: string; output: string; model: string }>;
  finalOutput: string | null;
  allOutputs: Record<string, string>;
}
```

### Event Handling Decision Tree

```
Receive SSE event
  |
  ├── type === "workflow_created"
  │     └── Store workflow_id + version_id
  │         Show "Workflow created with N steps"
  │
  ├── type === "clarification_needed"
  │     ├── Has workflow_id?
  │     │   ├── YES → Store workflow_id, show question, render input form
  │     │   │         Next request MUST include workflow_id + version_id
  │     │   └── NO  → Normal clarification (same as before)
  │     └── Show question + option buttons
  │
  ├── type === "execution_started"
  │     └── Show "Execution started" + initialize progress tracker
  │         Store execution_id
  │
  ├── type === "execution_progress"
  │     └── Update progress: "Step {completed_steps}/{total_steps}"
  │         Optionally show step output (image/video thumbnail)
  │         If step_status === "failed" → highlight failed step
  │
  ├── type === "execution_completed"
  │     └── Show final output (main video/image)
  │         Store all_outputs for gallery view
  │         Mark execution as complete
  │
  └── (all other events handled same as before)
```

### React Hook Extension

Extend the existing `useSenseChat` hook to handle workflow execution:

```typescript
// Additional state for workflow execution
const [workflowState, setWorkflowState] = useState<WorkflowExecutionState>({
  createdWorkflowId: null,
  createdVersionId: null,
  executionId: null,
  executionStatus: "idle",
  completedSteps: 0,
  totalSteps: 0,
  stepOutputs: {},
  finalOutput: null,
  allOutputs: {},
});

// Add these cases to the event handler switch:

case "workflow_created":
  setWorkflowState(prev => ({
    ...prev,
    createdWorkflowId: event.workflow_id,
    createdVersionId: event.version_id,
    totalSteps: event.steps_count,
  }));
  break;

case "clarification_needed":
  // Store workflow_id if present (for Turn 2)
  if (event.workflow_id) {
    setWorkflowState(prev => ({
      ...prev,
      createdWorkflowId: event.workflow_id,
      createdVersionId: event.version_id,
    }));
  }
  setState(prev => ({
    ...prev,
    clarification: {
      question: event.question,
      options: event.options || [],
      context: event.context || "",
      workflowId: event.workflow_id || null,    // NEW
      versionId: event.version_id || null,      // NEW
    },
  }));
  break;

case "execution_started":
  setWorkflowState(prev => ({
    ...prev,
    executionId: event.execution_id,
    executionStatus: "running",
    completedSteps: 0,
    stepOutputs: {},
  }));
  break;

case "execution_progress":
  setWorkflowState(prev => ({
    ...prev,
    completedSteps: event.completed_steps,
    totalSteps: event.total_steps,
    stepOutputs: {
      ...prev.stepOutputs,
      [event.step_id]: {
        status: event.step_status,
        output: event.output,
        model: event.model,
      },
    },
  }));
  break;

case "execution_completed":
  setWorkflowState(prev => ({
    ...prev,
    executionStatus: "completed",
    finalOutput: event.output,
    allOutputs: event.all_outputs,
  }));
  break;
```

**Sending Turn 2 with workflow_id:**

```typescript
// When user responds to a clarification that has a workflow_id:
const handleClarificationResponse = (userMessage: string) => {
  sendMessage(userMessage, {
    workflowId: workflowState.createdWorkflowId || undefined,
    versionId: workflowState.createdVersionId || undefined,
  });
};
```

### Step-by-Step Progress UI

Example component for showing workflow execution progress:

```tsx
function WorkflowProgress({ workflowState }: { workflowState: WorkflowExecutionState }) {
  if (workflowState.executionStatus === "idle") return null;

  const progress = workflowState.totalSteps > 0
    ? (workflowState.completedSteps / workflowState.totalSteps) * 100
    : 0;

  return (
    <div className="workflow-progress">
      <div className="progress-header">
        <span>Workflow Execution</span>
        <span>{workflowState.completedSteps}/{workflowState.totalSteps} steps</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Step outputs */}
      <div className="step-outputs">
        {Object.entries(workflowState.stepOutputs).map(([stepId, data]) => (
          <div key={stepId} className={`step ${data.status}`}>
            <span className="step-id">{stepId}</span>
            <span className="step-model">{data.model}</span>
            {data.output?.startsWith("http") && (
              <img src={data.output} alt={stepId} className="step-thumbnail" />
            )}
            <span className={`step-badge ${data.status}`}>
              {data.status === "completed" ? "Done" : "Failed"}
            </span>
          </div>
        ))}
      </div>

      {/* Final output */}
      {workflowState.finalOutput && (
        <div className="final-output">
          <h4>Final Result</h4>
          {workflowState.finalOutput.endsWith(".mp4") ? (
            <video src={workflowState.finalOutput} controls />
          ) : (
            <img src={workflowState.finalOutput} alt="Final output" />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Existing Flows Not Affected

These existing flows work exactly the same as before — no changes needed:

| Flow | Behavior |
|------|----------|
| Simple image generation | `execute_model` (unchanged) |
| Simple video generation | `execute_model` (unchanged) |
| Text responses | `generate_text` (unchanged) |
| Web search | `web_search` (unchanged) |
| Normal clarifications (no workflow) | `ask_clarification` (unchanged) |
| Workflow update via `/chat` with `workflow_id` | `build_workflow` (unchanged) |
| Workflow builder via `/workflow` endpoint | Unchanged |
| Image editing with uploads | `execute_model` (unchanged) |
| Multi-turn conversations | Session memory (unchanged) |

The new tools only activate when the agent detects that the request **requires multi-step generation with consistency across steps**. All other requests follow existing patterns.

---

## Timing Expectations

| Phase | Expected Duration |
|-------|-------------------|
| Turn 1 (workflow creation) | 10-30 seconds (model search + API call) |
| Turn 2 (execution) | 1-15 minutes depending on steps |
| Per-step progress updates | Every 5 seconds (polling interval) |
| Execution timeout | 15 minutes maximum |

**Important:** The `check_execution` tool polls every 5 seconds for up to 15 minutes. If execution times out, an `error` event is emitted. The frontend should show appropriate loading states for potentially long-running executions.
