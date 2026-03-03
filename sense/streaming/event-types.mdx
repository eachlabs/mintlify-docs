---
title: "Event Types"
description: "Complete reference for all 18 SSE streaming event types."
---

## AI Reasoning Events

### `thinking_delta`

Real-time AI reasoning text.

```json
{
  "type": "thinking_delta",
  "content": "Let me analyze this request. The user wants a portrait photo..."
}
```

### `text_response`

Assistant message content.

```json
{
  "type": "text_response",
  "content": "I found the perfect model for your portrait!"
}
```

## Tool Operation Events

### `status`

Current operation or tool being executed.

```json
{
  "type": "status",
  "message": "Searching for best model...",
  "tool_name": "search_models",
  "parameters": { "use_case": "portrait photo generation" }
}
```

### `tool_call`

Details of tool invocation.

```json
{
  "type": "tool_call",
  "name": "execute_model",
  "input": {
    "model_name": "nano-banana-pro",
    "inputs": { "prompt": "Professional headshot", "aspect_ratio": "1:1" }
  }
}
```

### `message`

Informational message from the agent.

```json
{
  "type": "message",
  "content": "Your video is being processed. This typically takes 2-3 minutes."
}
```

### `progress`

Generic progress update.

```json
{
  "type": "progress",
  "message": "Processing frame 45 of 120...",
  "percent": 37.5
}
```

## Generation Events

### `generation_response`

Generated media URLs.

```json
{
  "type": "generation_response",
  "url": "https://storage.eachlabs.ai/abc123.png",
  "generations": ["https://storage.eachlabs.ai/abc123.png"],
  "total": 1,
  "model": "nano-banana-pro",
  "execution_time_ms": 12500
}
```

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Primary output URL |
| `generations` | string[] | All generated URLs |
| `total` | number | Count of generations |
| `model` | string | Model used |
| `execution_time_ms` | number | Processing time |

## Interaction Events

### `clarification_needed`

Agent requests additional information.

```json
{
  "type": "clarification_needed",
  "question": "What style would you like?",
  "options": ["Photorealistic", "Artistic", "Anime", "Cinematic"],
  "context": "Each style produces very different results.",
  "requires_response": true
}
```

See [Clarifications](/sense/clarifications) for handling details.

## Web Search Events

### `web_search_query`

```json
{ "type": "web_search_query", "query": "latest AI image techniques", "recency": "month" }
```

### `web_search_citations`

```json
{
  "type": "web_search_citations",
  "citations": [
    { "title": "AI Art 2024", "url": "https://example.com/article", "snippet": "..." }
  ],
  "count": 1
}
```

## Workflow Events

### `workflow_created`

```json
{
  "type": "workflow_created",
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "workflow_name": "portrait-to-video",
  "steps_count": 3
}
```

### `workflow_fetched`

```json
{ "type": "workflow_fetched", "workflow_name": "my-workflow", "existing_steps": 3 }
```

### `workflow_built`

```json
{ "type": "workflow_built", "steps_count": 4, "definition": {...} }
```

### `workflow_updated`

```json
{ "type": "workflow_updated", "success": true, "workflow_id": "wf_abc123", "version_id": "v2" }
```

## Execution Events

### `execution_started`

```json
{ "type": "execution_started", "execution_id": "exec_xyz", "workflow_id": "wf_abc123" }
```

### `execution_progress`

```json
{
  "type": "execution_progress",
  "step_id": "step2",
  "step_status": "completed",
  "model": "kling-2-1-image-to-video",
  "output": "https://storage.eachlabs.ai/video.mp4",
  "completed_steps": 2,
  "total_steps": 4,
  "progress_percent": 50
}
```

### `execution_completed`

```json
{
  "type": "execution_completed",
  "execution_id": "exec_xyz",
  "status": "completed",
  "output": "https://storage.eachlabs.ai/final.mp4",
  "all_outputs": { "step1": "...", "step2": "...", "step3": "..." },
  "total_time_ms": 45000
}
```

## Terminal Events

### `complete`

Final event signaling task completion.

```json
{
  "type": "complete",
  "task_id": "chat_abc123",
  "status": "ok",
  "generations": ["https://storage.eachlabs.ai/portrait.png"],
  "model": "nano-banana-pro",
  "total_time_ms": 15000
}
```

| Status | Description |
|--------|-------------|
| `ok` | Task completed successfully |
| `error` | Task failed |
| `clarification_needed` | Waiting for user input |

### `error`

Error during processing.

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
