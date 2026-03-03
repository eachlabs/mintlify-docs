# Response Types

Complete reference for all response types and streaming events.

---

## Table of Contents

- [Streaming Event Types (18 Types)](#streaming-event-types)
- [Non-Streaming Response Format](#non-streaming-response-format)
- [OpenAI Compatible Format](#openai-compatible-format)
- [Event Type Reference](#event-type-reference)

---

## Streaming Event Types

The API uses Server-Sent Events (SSE) with 18 distinct event types. Each event follows this format:

```
data: {"type": "event_type", ...fields}\n\n
```

The stream terminates with:
```
data: [DONE]\n\n
```

### Event Categories

| Category | Event Types |
|----------|-------------|
| **AI Reasoning** | `thinking_delta`, `text_response` |
| **Tool Operations** | `status`, `tool_call`, `message`, `progress` |
| **Generation Results** | `generation_response` |
| **User Interaction** | `clarification_needed` |
| **Web Search** | `web_search_query`, `web_search_citations` |
| **Workflow** | `workflow_created`, `workflow_fetched`, `workflow_built`, `workflow_updated` |
| **Execution** | `execution_started`, `execution_progress`, `execution_completed` |
| **Terminal** | `complete`, `error` |

---

## Event Type Reference

### 1. `thinking_delta`

Real-time streaming of the AI's reasoning process.

```json
{
  "type": "thinking_delta",
  "content": "Let me analyze this request. The user wants to generate a portrait photo, so I should search for image generation models..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"thinking_delta"` |
| `content` | `string` | Incremental thinking text |

**Use Case:** Display AI reasoning in UI for transparency.

---

### 2. `status`

Current operation or tool being executed.

```json
{
  "type": "status",
  "message": "Searching for best model...",
  "tool_name": "search_models",
  "parameters": {
    "use_case": "portrait photo generation"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"status"` |
| `message` | `string` | Human-readable status |
| `tool_name` | `string` | Tool being executed (optional) |
| `parameters` | `object` | Tool parameters (optional) |

**Use Case:** Show loading states with context.

---

### 3. `text_response`

Text content from the AI assistant.

```json
{
  "type": "text_response",
  "content": "I found the perfect model for your portrait! Using nano-banana-pro which excels at photorealistic portraits."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"text_response"` |
| `content` | `string` | Text message content |

**Use Case:** Display assistant messages in chat UI.

---

### 4. `generation_response`

Generated media URL(s) from model execution.

```json
{
  "type": "generation_response",
  "url": "https://storage.eachlabs.ai/generations/abc123.png",
  "generations": [
    "https://storage.eachlabs.ai/generations/abc123.png"
  ],
  "total": 1,
  "tool_name": "execute_model",
  "model": "nano-banana-pro",
  "execution_time_ms": 12500
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"generation_response"` |
| `url` | `string` | Primary output URL |
| `generations` | `string[]` | All generated URLs |
| `total` | `number` | Count of generations |
| `tool_name` | `string` | Tool that generated this |
| `model` | `string` | Model used |
| `execution_time_ms` | `number` | Time taken (optional) |

**Use Case:** Display generated images/videos.

---

### 5. `clarification_needed`

AI requests additional information from the user.

```json
{
  "type": "clarification_needed",
  "question": "What style would you like for your portrait?",
  "options": [
    "Photorealistic - Natural, high-quality photo",
    "Artistic - Painterly, stylized look",
    "Anime - Japanese animation style",
    "Cinematic - Movie poster aesthetic"
  ],
  "context": "I can see you want a portrait. To give you the best result, I need to know your preferred style.",
  "requires_response": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"clarification_needed"` |
| `question` | `string` | Question to ask user |
| `options` | `string[]` | Suggested options (optional) |
| `context` | `string` | Additional context |
| `requires_response` | `boolean` | Whether response is required |

**Use Case:** Display interactive choices in UI. User responds with same `session_id`.

---

### 6. `web_search_query`

Web search being executed.

```json
{
  "type": "web_search_query",
  "query": "latest AI image generation techniques 2024",
  "recency": "month"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"web_search_query"` |
| `query` | `string` | Search query |
| `recency` | `string` | Time filter: `day`, `week`, `month`, `year` |

---

### 7. `web_search_citations`

Citations from web search results.

```json
{
  "type": "web_search_citations",
  "citations": [
    {
      "title": "State of AI Art 2024",
      "url": "https://example.com/ai-art-2024",
      "snippet": "The latest developments in AI image generation..."
    },
    {
      "title": "Flux Model Overview",
      "url": "https://example.com/flux-model",
      "snippet": "Flux is a state-of-the-art text-to-image model..."
    }
  ],
  "count": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"web_search_citations"` |
| `citations` | `array` | List of citation objects |
| `count` | `number` | Number of citations |

---

### 8. `workflow_created`

New workflow has been created.

```json
{
  "type": "workflow_created",
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "workflow_name": "portrait-to-video",
  "input_schema": {
    "description": {
      "type": "string",
      "description": "Description of the person"
    },
    "style": {
      "type": "string",
      "enum": ["realistic", "anime", "artistic"]
    }
  },
  "steps_count": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"workflow_created"` |
| `workflow_id` | `string` | Unique workflow identifier |
| `version_id` | `string` | Version identifier |
| `workflow_name` | `string` | Human-readable name |
| `input_schema` | `object` | Required inputs |
| `steps_count` | `number` | Number of steps |

---

### 9. `workflow_fetched`

Existing workflow loaded for modification.

```json
{
  "type": "workflow_fetched",
  "workflow_name": "my-portrait-workflow",
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "existing_steps": 3,
  "existing_definition": {
    "steps": [...],
    "input_schema": {...}
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"workflow_fetched"` |
| `workflow_name` | `string` | Workflow name |
| `workflow_id` | `string` | Workflow ID |
| `version_id` | `string` | Version ID |
| `existing_steps` | `number` | Current step count |
| `existing_definition` | `object` | Full workflow definition |

---

### 10. `workflow_built`

Workflow definition has been constructed.

```json
{
  "type": "workflow_built",
  "steps_count": 4,
  "definition": {
    "steps": [
      {
        "id": "step1",
        "model": "nano-banana-pro",
        "params": {"prompt": "$.inputs.description"}
      },
      {
        "id": "step2",
        "model": "kling-2-1-image-to-video",
        "params": {"image": "$.step1.primary"}
      }
    ],
    "input_schema": {...}
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"workflow_built"` |
| `steps_count` | `number` | Number of steps |
| `definition` | `object` | Complete workflow definition |

---

### 11. `workflow_updated`

Workflow pushed to Eachlabs API.

```json
{
  "type": "workflow_updated",
  "success": true,
  "workflow_id": "wf_abc123",
  "version_id": "v2",
  "definition": {...},
  "message": "Workflow updated successfully"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"workflow_updated"` |
| `success` | `boolean` | Whether update succeeded |
| `workflow_id` | `string` | Workflow ID |
| `version_id` | `string` | New version ID |
| `definition` | `object` | Updated definition |
| `message` | `string` | Status message |

---

### 12. `execution_started`

Workflow execution has begun.

```json
{
  "type": "execution_started",
  "execution_id": "exec_xyz789",
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "inputs": {
    "description": "Professional headshot",
    "style": "realistic"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"execution_started"` |
| `execution_id` | `string` | Unique execution ID |
| `workflow_id` | `string` | Workflow being executed |
| `version_id` | `string` | Version being executed |
| `inputs` | `object` | Input values provided |

---

### 13. `execution_progress`

Progress update during workflow execution.

```json
{
  "type": "execution_progress",
  "execution_id": "exec_xyz789",
  "step_id": "step2",
  "step_status": "completed",
  "model": "kling-2-1-image-to-video",
  "output": "https://storage.eachlabs.ai/video.mp4",
  "completed_steps": 2,
  "total_steps": 4,
  "progress_percent": 50
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"execution_progress"` |
| `execution_id` | `string` | Execution ID |
| `step_id` | `string` | Current step ID |
| `step_status` | `string` | `pending`, `running`, `completed`, `failed` |
| `model` | `string` | Model used in step |
| `output` | `string` | Step output URL (if completed) |
| `completed_steps` | `number` | Steps completed |
| `total_steps` | `number` | Total steps |
| `progress_percent` | `number` | Overall progress percentage |

---

### 14. `execution_completed`

Workflow execution finished.

```json
{
  "type": "execution_completed",
  "execution_id": "exec_xyz789",
  "workflow_id": "wf_abc123",
  "status": "completed",
  "output": "https://storage.eachlabs.ai/final_video.mp4",
  "all_outputs": {
    "step1": "https://storage.eachlabs.ai/portrait.png",
    "step2": "https://storage.eachlabs.ai/video.mp4",
    "step3": "https://storage.eachlabs.ai/final_video.mp4"
  },
  "total_time_ms": 45000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"execution_completed"` |
| `execution_id` | `string` | Execution ID |
| `workflow_id` | `string` | Workflow ID |
| `status` | `string` | `completed`, `failed`, `cancelled` |
| `output` | `string` | Final output URL |
| `all_outputs` | `object` | All step outputs by step ID |
| `total_time_ms` | `number` | Total execution time |

---

### 15. `tool_call`

Details of tool being invoked.

```json
{
  "type": "tool_call",
  "name": "execute_model",
  "input": {
    "model_name": "nano-banana-pro",
    "inputs": {
      "prompt": "Professional headshot portrait",
      "aspect_ratio": "1:1"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"tool_call"` |
| `name` | `string` | Tool name |
| `input` | `object` | Tool input parameters |

---

### 16. `message`

Informational message from agent.

```json
{
  "type": "message",
  "content": "Your video is being processed. This typically takes 2-3 minutes for a 5-second video."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"message"` |
| `content` | `string` | Message content |

---

### 17. `progress`

Generic progress update.

```json
{
  "type": "progress",
  "message": "Processing frame 45 of 120...",
  "percent": 37.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"progress"` |
| `message` | `string` | Progress message |
| `percent` | `number` | Progress percentage (optional) |

---

### 18. `complete`

Final event signaling task completion.

```json
{
  "type": "complete",
  "task_id": "chat_abc123",
  "status": "ok",
  "tool_calls": [
    {"name": "search_models", "success": true},
    {"name": "execute_model", "success": true}
  ],
  "generations": [
    "https://storage.eachlabs.ai/portrait.png"
  ],
  "model": "nano-banana-pro",
  "total_time_ms": 15000,
  "tokens_used": {
    "prompt": 150,
    "completion": 85
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"complete"` |
| `task_id` | `string` | Unique task ID |
| `status` | `string` | `ok`, `error`, `clarification_needed` |
| `tool_calls` | `array` | Tools called during task |
| `generations` | `string[]` | All generated URLs |
| `model` | `string` | Primary model used |
| `total_time_ms` | `number` | Total processing time |
| `tokens_used` | `object` | Token usage (optional) |

---

### `error`

Error occurred during processing.

```json
{
  "type": "error",
  "message": "Failed to execute model: Insufficient balance",
  "error_code": "INSUFFICIENT_BALANCE",
  "details": {
    "required_balance": 0.50,
    "current_balance": 0.10,
    "top_up_url": "https://eachlabs.ai/billing"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Always `"error"` |
| `message` | `string` | Error message |
| `error_code` | `string` | Error code (optional) |
| `details` | `object` | Additional error details (optional) |

---

## Non-Streaming Response Format

When `stream: false`, the API returns a single JSON response:

### Success Response

```json
{
  "task_id": "chat_abc123",
  "status": "ok",
  "generations": [
    "https://storage.eachlabs.ai/portrait.png"
  ],
  "text_response": "Here's your professional portrait! I used nano-banana-pro for the best quality.",
  "model": "nano-banana-pro",
  "session_id": "my-session",
  "tool_calls": [
    {"name": "search_models", "success": true},
    {"name": "execute_model", "success": true}
  ]
}
```

### Clarification Response

```json
{
  "success": true,
  "clarification_needed": true,
  "question": "What style would you prefer?",
  "options": ["Photorealistic", "Artistic", "Anime"],
  "context": "I can help generate your portrait, but I need to know your preferred style first.",
  "session_id": "my-session"
}
```

### Workflow Response

```json
{
  "success": true,
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "definition": {
    "steps": [...],
    "input_schema": {...}
  },
  "message": "Workflow created successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Insufficient balance",
  "error_code": "INSUFFICIENT_BALANCE",
  "message": "Please top up your account to continue",
  "details": {
    "required": 0.50,
    "available": 0.10
  }
}
```

---

## OpenAI Compatible Format

The `/v1/chat/completions` endpoint wraps events in OpenAI-compatible format:

### Streaming Chunk

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1708345678,
  "model": "eachsense/beta",
  "choices": [
    {
      "index": 0,
      "delta": {
        "role": "assistant",
        "content": "Generating your image..."
      },
      "finish_reason": null
    }
  ],
  "eachlabs": {
    "type": "text_response",
    "content": "Generating your image..."
  }
}
```

### Final Chunk

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1708345678,
  "model": "eachsense/beta",
  "choices": [
    {
      "index": 0,
      "delta": {},
      "finish_reason": "stop"
    }
  ],
  "generations": ["https://storage.eachlabs.ai/image.png"],
  "eachlabs": {
    "type": "complete",
    "status": "ok"
  }
}
```

The `eachlabs` field contains the native event type and data for clients that want detailed control.
