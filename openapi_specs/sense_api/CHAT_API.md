# Chat API Documentation

## Endpoint

```
POST /chat
```

## Overview

The `/chat` endpoint is a unified AI assistant that can generate images, videos, build workflows, search the web, and hold conversational interactions. It uses the **Eachlabs LLM Router** as the orchestrator (OpenAI-compatible API with 300+ models) with access to specialized tools.

**Default Model:** `zai/GLM-4.7`

## Authentication

Include the API key in the request header:

```
X-API-Key: your_api_key_here
```

**Security Note:** Session memory is scoped by API key. Users can only access their own sessions - a `session_id` from one API key cannot be accessed by another API key.

---

## Request Schema

```json
{
  "message": "string (required) - User's request",
  "session_id": "string (optional) - Session ID for conversation continuity",
  "stream": "boolean (optional, default: true) - Enable SSE streaming",
  "mode": "string (optional, default: 'max') - Quality mode: 'max' or 'eco'",
  "behavior": "string (optional, default: 'agent') - Behavior: 'agent', 'plan', or 'ask'",
  "model": "string (optional, default: 'auto') - Model slug or 'auto' for AI selection",
  "image_urls": "array[string] (optional) - Image URLs for editing/processing",
  "workflow_id": "string (optional) - Enables workflow building mode",
  "version_id": "string (optional) - Required with workflow_id",
  "web_search": "boolean (optional, default: true) - Enable/disable web search",
  "enable_safety_checker": "boolean (optional, default: true) - Enable/disable NSFW content filter"
}
```

### Field Details

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | string | required | The user's natural language request |
| `session_id` | string | null | Maintains conversation context across requests |
| `stream` | boolean | true | When true, returns SSE stream; when false, returns JSON |
| `mode` | string | "max" | `max` = best quality models, `eco` = fastest/cheapest models |
| `behavior` | string | "agent" | `agent` = auto-execute, `plan` = explain first, `ask` = clarify first |
| `model` | string | "auto" | Specific model slug (e.g., "flux-2-max") or "auto" to let AI choose |
| `image_urls` | array | null | URLs of images to process/edit |
| `workflow_id` | string | null | When provided, enables the `build_workflow` tool |
| `version_id` | string | null | Workflow version (e.g., "v1"), required with workflow_id |
| `web_search` | boolean | true | Allow web search for up-to-date information |
| `enable_safety_checker` | boolean | true | When false, disables NSFW filter for supported models (see below) |

---

## Response Types

### Streaming Response (SSE)

When `stream: true`, the endpoint returns Server-Sent Events (SSE) with `Content-Type: text/event-stream`.

Each event has the format:
```
data: {"type": "event_type", ...fields}\n\n
```

Stream ends with:
```
data: [DONE]\n\n
```

### Non-Streaming Response (JSON)

When `stream: false`, returns a single JSON object with aggregated results.

---

## SSE Event Types

### 1. `thinking_delta`
Claude's reasoning as it streams in real-time.

```json
{
  "type": "thinking_delta",
  "content": "Let me find the best model for portrait generation..."
}
```

### 2. `status`
Current operation being executed.

```json
{
  "type": "status",
  "message": "Searching for image generation models...",
  "tool_name": "search_models",
  "parameters": {"use_case": "text to image portrait"}
}
```

### 3. `text_response`
Text content from the AI (explanations, answers, plans).

```json
{
  "type": "text_response",
  "content": "I'll create a stunning portrait for you with cinematic lighting and a warm mood."
}
```

### 4. `generation_response`
Generated media URL (image/video).

```json
{
  "type": "generation_response",
  "url": "https://storage.eachlabs.ai/outputs/abc123.png",
  "generations": ["https://storage.eachlabs.ai/outputs/abc123.png"],
  "total": 1,
  "tool_name": "execute_model",
  "model": "nano-banana-pro"
}
```

### 5. `clarification_needed`
AI needs more information to proceed.

```json
{
  "type": "clarification_needed",
  "question": "What type of edit would you like to make to this image?",
  "options": [
    "Remove the background",
    "Apply a style transfer",
    "Upscale to higher resolution",
    "Add or modify elements"
  ],
  "context": "I can see you've uploaded an image, but I need to understand what changes you'd like."
}
```

### 6. `web_search_query`
Web search being executed.

```json
{
  "type": "web_search_query",
  "query": "best AI video generation models 2024",
  "recency": "month"
}
```

### 7. `web_search_citations`
Citations from web search results.

```json
{
  "type": "web_search_citations",
  "citations": [
    "https://example.com/ai-video-comparison",
    "https://techblog.com/veo3-review"
  ],
  "count": 2
}
```

### 8. `workflow_created`
New workflow was created (for complex multi-step generation).

```json
{
  "type": "workflow_created",
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "input_schema": {
    "properties": {
      "character_description": {
        "type": "text",
        "required": true,
        "default_value": ""
      }
    }
  },
  "steps_count": 5
}
```

### 9. `workflow_fetched`
Existing workflow was loaded (when workflow_id provided).

```json
{
  "type": "workflow_fetched",
  "workflow_name": "Product Video Generator",
  "existing_steps": 3,
  "existing_definition": {...}
}
```

### 10. `workflow_built`
Workflow definition constructed.

```json
{
  "type": "workflow_built",
  "steps_count": 4,
  "definition": {
    "version": "v1",
    "input_schema": {...},
    "steps": [...]
  }
}
```

### 11. `workflow_updated`
Workflow pushed to the Eachlabs API.

```json
{
  "type": "workflow_updated",
  "success": true,
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "definition": {...}
}
```

### 12. `execution_started`
Workflow execution has begun.

```json
{
  "type": "execution_started",
  "execution_id": "exec_xyz789",
  "workflow_id": "wf_abc123"
}
```

### 13. `execution_progress`
Progress update during workflow execution.

```json
{
  "type": "execution_progress",
  "step_id": "step2",
  "step_status": "completed",
  "output": "https://storage.eachlabs.ai/outputs/step2.png",
  "model": "nano-banana-pro",
  "completed_steps": 2,
  "total_steps": 5
}
```

### 14. `execution_completed`
Workflow execution finished.

```json
{
  "type": "execution_completed",
  "execution_id": "exec_xyz789",
  "status": "completed",
  "output": "https://storage.eachlabs.ai/outputs/final.mp4",
  "all_outputs": {
    "step1": "https://storage.eachlabs.ai/outputs/step1.png",
    "step2": "https://storage.eachlabs.ai/outputs/step2.png",
    "step3": "https://storage.eachlabs.ai/outputs/final.mp4"
  }
}
```

### 15. `tool_call`
Details of a tool being called.

```json
{
  "type": "tool_call",
  "name": "execute_model",
  "input": {
    "model_name": "nano-banana-pro",
    "inputs": {
      "prompt": "A beautiful woman portrait...",
      "aspect_ratio": "1:1"
    }
  }
}
```

### 16. `message`
Informational message from the agent.

```json
{
  "type": "message",
  "content": "Your video is being processed. This typically takes 2-3 minutes."
}
```

### 17. `complete`
Final event with summary.

```json
{
  "type": "complete",
  "task_id": "chat_1708345678901",
  "status": "ok",
  "tool_calls": [
    {"name": "search_models", "result": "success"},
    {"name": "get_model_details", "result": "success"},
    {"name": "execute_model", "result": "success", "model": "nano-banana-pro"}
  ],
  "generations": ["https://storage.eachlabs.ai/outputs/abc123.png"],
  "model": "nano-banana-pro"
}
```

### 18. `error`
An error occurred.

```json
{
  "type": "error",
  "message": "Failed to generate image: Invalid aspect ratio"
}
```

---

## Non-Streaming Response Schema

When `stream: false`:

### Success Response
```json
{
  "task_id": "chat_1708345678901",
  "status": "ok",
  "generations": ["https://storage.eachlabs.ai/outputs/abc123.png"],
  "text_response": "Here's your generated portrait!",
  "model": "nano-banana-pro"
}
```

### Clarification Response
```json
{
  "success": true,
  "clarification_needed": true,
  "question": "What style would you like for the portrait?",
  "options": ["Photorealistic", "Artistic/Painterly", "Anime/Illustration", "Cinematic"],
  "context": "I want to create the perfect portrait for you."
}
```

### Workflow Response
```json
{
  "success": true,
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "definition": {...}
}
```

---

## Use Case Examples

### 1. Simple Image Generation

**Request:**
```json
{
  "message": "Generate a portrait of a woman with golden hour lighting",
  "stream": true,
  "mode": "max"
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I'll create a beautiful portrait for you with golden hour lighting!"}

data: {"type": "status", "message": "Searching for image generation models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Getting model details...", "tool_name": "get_model_details"}

data: {"type": "status", "message": "Generating with nano-banana-pro...", "tool_name": "execute_model", "model": "nano-banana-pro"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/portrait.png", "generations": ["https://storage.eachlabs.ai/outputs/portrait.png"], "total": 1, "model": "nano-banana-pro"}

data: {"type": "complete", "task_id": "chat_123", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/portrait.png"], "model": "nano-banana-pro"}

data: [DONE]
```

---

### 2. Image Editing (with uploaded image)

**Request:**
```json
{
  "message": "Remove the background from this image",
  "image_urls": ["https://example.com/my-photo.jpg"],
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I'll remove the background from your image."}

data: {"type": "status", "message": "Searching for background removal models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Generating with background-removal...", "tool_name": "execute_model"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/no-bg.png", "generations": ["https://storage.eachlabs.ai/outputs/no-bg.png"], "total": 1}

data: {"type": "complete", "task_id": "chat_456", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/no-bg.png"]}

data: [DONE]
```

---

### 3. Video Generation

**Request:**
```json
{
  "message": "Create a 5 second video of a sunset over the ocean",
  "stream": true,
  "mode": "max"
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I'll create a beautiful sunset video for you!"}

data: {"type": "status", "message": "Searching for video generation models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Getting model details for veo3-1-text-to-video-fast...", "tool_name": "get_model_details"}

data: {"type": "status", "message": "Generating with veo3-1-text-to-video-fast...", "tool_name": "execute_model"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/sunset.mp4", "generations": ["https://storage.eachlabs.ai/outputs/sunset.mp4"], "total": 1, "model": "veo3-1-text-to-video-fast"}

data: {"type": "complete", "task_id": "chat_789", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/sunset.mp4"], "model": "veo3-1-text-to-video-fast"}

data: [DONE]
```

---

### 4. Direct Model Execution (skip search)

**Request:**
```json
{
  "message": "A cyberpunk city at night with neon lights",
  "model": "flux-2-max",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "status", "message": "Running flux-2-max (~10s)...", "tool_name": "flux-2-max"}

data: {"type": "thinking_delta", "content": "Running flux-2-max..."}

data: {"type": "status", "message": "Generating with flux-2-max...", "tool_name": "execute_model", "model": "flux-2-max"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/cyberpunk.png", "generations": ["https://storage.eachlabs.ai/outputs/cyberpunk.png"], "total": 1, "model": "flux-2-max"}

data: {"type": "complete", "task_id": "chat_direct_1", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/cyberpunk.png"], "model": "flux-2-max"}

data: [DONE]
```

---

### 5. Clarification Needed

**Request:**
```json
{
  "message": "Edit this image",
  "image_urls": ["https://example.com/photo.jpg"],
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I see you've uploaded an image, but I need to understand what changes you'd like me to make."}

data: {"type": "clarification_needed", "question": "What type of edit would you like to make to this image?", "options": ["Remove the background", "Apply a style transfer", "Upscale to higher resolution", "Add or modify elements", "Change colors or lighting"], "context": "I can see your image but need to know the specific edit you want."}

data: {"type": "complete", "task_id": "chat_clarify_1", "status": "awaiting_input"}

data: [DONE]
```

**Follow-up Request:**
```json
{
  "message": "Remove the background",
  "session_id": "session_abc123",
  "image_urls": ["https://example.com/photo.jpg"],
  "stream": true
}
```

---

### 6. Complex Multi-Step Generation (Workflow Creation)

**Request:**
```json
{
  "message": "Create a 30 second UGC video with a consistent presenter explaining why fitness is important",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "For a 30-second video with a consistent presenter, I'll create a multi-scene workflow..."}

data: {"type": "status", "message": "Searching for image generation models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Searching for video generation models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Creating workflow...", "tool_name": "create_workflow"}

data: {"type": "workflow_created", "workflow_id": "wf_ugc123", "version_id": "v1", "input_schema": {"properties": {"presenter_description": {"type": "text", "required": true}, "background_style": {"type": "text", "required": false}}}, "steps_count": 6}

data: {"type": "clarification_needed", "question": "Please provide the following details for your UGC video:", "options": ["Describe the presenter (age, gender, appearance, clothing)", "What background/setting should they be in?", "Any specific fitness topic to focus on?"], "context": "I've created a workflow for your 30-second UGC video. It will generate a consistent presenter across 4 scenes and merge them."}

data: {"type": "complete", "task_id": "chat_ugc_1", "status": "awaiting_input"}

data: [DONE]
```

**Follow-up with inputs:**
```json
{
  "message": "The presenter is a 30-year-old fit woman with brown hair in workout clothes, gym background, focus on mental health benefits of exercise",
  "session_id": "session_ugc123",
  "stream": true
}
```

---

### 7. Workflow Building Mode

**Request:**
```json
{
  "message": "Add a step to upscale the final output",
  "workflow_id": "wf_existing123",
  "version_id": "v1",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "workflow_fetched", "workflow_name": "Product Video Generator", "existing_steps": 3}

data: {"type": "thinking_delta", "content": "I'll add an upscaling step to your existing workflow..."}

data: {"type": "status", "message": "Searching for upscaling models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Building workflow definition...", "tool_name": "build_workflow"}

data: {"type": "workflow_built", "steps_count": 4}

data: {"type": "workflow_updated", "success": true, "workflow_id": "wf_existing123", "version_id": "v1", "definition": {...}}

data: {"type": "complete", "task_id": "chat_wf_1", "status": "ok", "workflow_id": "wf_existing123", "version_id": "v1"}

data: [DONE]
```

---

### 8. ECO Mode (Budget-Friendly)

**Request:**
```json
{
  "message": "Generate a product photo of a coffee mug",
  "mode": "eco",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "status", "message": "Understanding your request...", "tool_name": "chat"}

data: {"type": "thinking_delta", "content": "Using ECO mode - I'll find a fast and cost-effective model..."}

data: {"type": "status", "message": "Searching for image generation models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Generating with flux-1-schnell...", "tool_name": "execute_model", "model": "flux-1-schnell"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/mug.png", "generations": ["https://storage.eachlabs.ai/outputs/mug.png"], "total": 1, "model": "flux-1-schnell"}

data: {"type": "complete", "task_id": "chat_eco_1", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/mug.png"], "model": "flux-1-schnell"}

data: [DONE]
```

---

### 9. PLAN Mode (Explain Before Executing)

**Request:**
```json
{
  "message": "Create a marketing video for my bakery",
  "behavior": "plan",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I'm in plan mode, so I'll outline my approach before executing anything..."}

data: {"type": "text_response", "content": "Here's my plan for your bakery marketing video:\n\n**What I need from you:**\n- Your bakery name and logo\n- Photos of your signature products\n- Target audience (local customers, tourists, etc.)\n- Desired video length (15s, 30s, 60s)\n\n**Steps:**\n1. Generate appetizing product shots with professional lighting\n2. Create a consistent brand aesthetic across scenes\n3. Write an engaging script highlighting your unique offerings\n4. Generate voiceover from the script\n5. Animate scenes into video clips\n6. Merge into final marketing video\n\n**Output:** Vertical 9:16 video for social media, your chosen duration\n\nTo execute this plan, please switch to **Agent mode** and provide the requested details."}

data: {"type": "complete", "task_id": "chat_plan_1", "status": "ok"}

data: [DONE]
```

---

### 10. ASK Mode (Always Clarify First)

**Request:**
```json
{
  "message": "Generate a portrait",
  "behavior": "ask",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "In ASK mode, I need to gather all details before proceeding..."}

data: {"type": "clarification_needed", "question": "I'd love to create a portrait for you! Please help me understand what you're looking for:", "options": ["Photorealistic portrait (like a professional photo)", "Artistic/painterly style", "Anime or illustration style", "Cinematic movie poster style"], "context": "I also need to know: Subject (man/woman/specific person), Mood/emotion, Background preference, and Aspect ratio (square, portrait, landscape)."}

data: {"type": "complete", "task_id": "chat_ask_1", "status": "awaiting_input"}

data: [DONE]
```

---

### 11. Image-to-Video Animation

**Request:**
```json
{
  "message": "Animate this image with gentle camera movement",
  "image_urls": ["https://example.com/landscape.jpg"],
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "I'll animate your landscape image with a gentle camera movement effect..."}

data: {"type": "status", "message": "Searching for image to video models...", "tool_name": "search_models"}

data: {"type": "status", "message": "Generating with kling-2-1-image-to-video...", "tool_name": "execute_model"}

data: {"type": "generation_response", "url": "https://storage.eachlabs.ai/outputs/animated.mp4", "generations": ["https://storage.eachlabs.ai/outputs/animated.mp4"], "total": 1, "model": "kling-2-1-image-to-video"}

data: {"type": "complete", "task_id": "chat_i2v_1", "status": "ok", "generations": ["https://storage.eachlabs.ai/outputs/animated.mp4"], "model": "kling-2-1-image-to-video"}

data: [DONE]
```

---

### 12. Web Search Integration

**Request:**
```json
{
  "message": "What's the best AI model for generating realistic human faces in 2024?",
  "stream": true
}
```

**SSE Stream:**
```
data: {"type": "thinking_delta", "content": "Let me search for the latest information on AI face generation models..."}

data: {"type": "web_search_query", "query": "best AI model realistic human face generation 2024", "recency": "month"}

data: {"type": "status", "message": "Searching the web: best AI model realistic human face..."}

data: {"type": "web_search_citations", "citations": ["https://techreview.com/ai-portraits-2024", "https://aimodels.org/face-generation"], "count": 2}

data: {"type": "text_response", "content": "Based on current benchmarks and reviews, the top models for realistic human face generation in 2024 are:\n\n1. **Nano Banana Pro** - Excellent at photorealistic portraits with consistent quality\n2. **GPT Image 1.5** - OpenAI's latest with exceptional detail and prompt understanding\n3. **Flux 2 Max** - Fast generation with high fidelity\n\nFor the most natural results, I'd recommend Nano Banana Pro, which is available on Eachlabs."}

data: {"type": "complete", "task_id": "chat_search_1", "status": "ok"}

data: [DONE]
```

---

## Error Handling

### 401 Unauthorized
```json
{
  "detail": "API key is required."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error message describing what went wrong"
}
```

### 503 Service Unavailable
```json
{
  "detail": "ChatAgent not available"
}
```

### Streaming Error Event
```
data: {"type": "error", "message": "Failed to execute model: Invalid parameters"}
```

### Common Streaming Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `Failed to create prediction: HTTP 422` | Insufficient account balance | Top up your Eachlabs account balance |
| `Failed to execute model: Invalid parameters` | Missing or invalid model inputs | Check required parameters for the model |
| `Model not found` | Invalid model slug | Use `search_models` to find valid models |
| `Workflow execution timed out after 15 minutes` | Long-running workflow exceeded limit | Split into smaller workflows |

#### Insufficient Balance Error
When the user's Eachlabs account has insufficient balance:
```
data: {"type": "error", "message": "Failed to create prediction: HTTP 422"}
```

---

## Available Tools (Internal)

The AI agent has access to these tools:

| Tool | Type | Description |
|------|------|-------------|
| `search_models` | Non-terminal | Search for AI models matching a use case |
| `get_model_details` | Non-terminal | Get detailed input schema for a model |
| `web_search` | Non-terminal | Search the web for up-to-date information |
| `vision_preprocessor` | Non-terminal | Analyze uploaded images to understand content |
| `create_workflow` | Non-terminal | Create a multi-step workflow for complex generation |
| `trigger_workflow` | Non-terminal | Start execution of a created workflow |
| `execute_model` | Terminal | Execute a model with given inputs |
| `build_workflow` | Terminal | Build/update a workflow definition (when workflow_id provided) |
| `generate_text` | Terminal | Return a text response |
| `ask_clarification` | Terminal | Ask user for more information |
| `check_execution` | Terminal | Monitor workflow execution until complete |

---

## Supported Model Aliases

Common shorthand names that are automatically resolved:

| Alias | Resolves To |
|-------|-------------|
| "flux max" | flux-2-max |
| "flux pro" | flux-2-pro |
| "gpt image" | gpt-image-1-5 |
| "nano banana pro" | nano-banana-pro |
| "seedream" | seedream-4-5 |
| "gemini imagen" | gemini-imagen-4 |
| "kling 3" | kling-3-0 |
| "veo" | veo3-1-text-to-video-fast |
| "sora" | sora-2 |
| "hailuo" | hailuo-2-3 |

---

## Best Practices

1. **Use session_id** for multi-turn conversations to maintain context
2. **Use ECO mode** for cost-sensitive applications or prototyping
3. **Use specific model** when you know exactly which model you want (faster execution)
4. **Provide image dimensions** - the API automatically detects and preserves aspect ratios
5. **Handle clarification events** - respond with the requested information in the same session
6. **Monitor long operations** - workflow executions emit progress events every 5 seconds

---

## NSFW Content Generation

The `enable_safety_checker` parameter allows disabling the NSFW content filter for supported models. When set to `false`, the safety checker is disabled, allowing adult content generation.

### Request Example

```json
{
  "message": "Generate an artistic nude portrait",
  "enable_safety_checker": false,
  "stream": true
}
```

### Supported Models

The following models support `enable_safety_checker: false`:

**Alibaba / Wan Models:**
| Model Slug | Type |
|------------|------|
| `wan-v2-6-text-to-image` | Text to Image |
| `wan-v2-6-image-to-image` | Image to Image |
| `wan-v2-6-text-to-video` | Text to Video |
| `wan-v2-6-image-to-video` | Image to Video |
| `wan-v2-6-image-to-video-flash` | Image to Video (Fast) |
| `wan-v2-6-reference-to-video` | Reference to Video |
| `wan-2-5-preview-image-to-video` | Image to Video |
| `wan-2-5-preview-text-to-video` | Text to Video |
| `wan-v2-2-a14b-image-to-video` | Image to Video |
| `wan-v2-2-a14b-image-to-video-turbo` | Image to Video (Turbo) |

**ByteDance / Seedream Models:**
| Model Slug | Type |
|------------|------|
| `seedream-v4-5-text-to-image` | Text to Image |
| `seedream-v4-5-edit` | Image Editing |
| `seedance-v1-pro-fast-text-to-video` | Text to Video |
| `seedance-v1-pro-fast-image-to-video` | Image to Video |
| `seedance-v1-5-pro-text-to-video` | Text to Video |
| `seedance-v1-5-pro-image-to-video` | Image to Video |
| `omnihuman-v1-5` | Human Generation |
| `omnihuman` | Human Generation |
| `dreamactor-v2` | Avatar Animation |

### Direct Model Execution with NSFW

For direct model execution with NSFW content:

```json
{
  "message": "A romantic artistic scene",
  "model": "wan-v2-6-text-to-image",
  "enable_safety_checker": false,
  "stream": true
}
```

### Important Notes

1. **Default behavior**: `enable_safety_checker` is `true` by default - content is filtered for safety
2. **Unsupported models**: For models not in the supported list, this parameter has no effect
3. **User responsibility**: Users are responsible for complying with local laws and platform terms of service when generating adult content
4. **API enforcement**: The parameter only affects model execution - platform-level restrictions may still apply

---

## Memory Endpoints

Session memory is **scoped by API key** - users can only access their own sessions.

### GET /memory

Get conversation memory for a session.

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `session_id` (optional): Session ID to get memory for

**Response:**
```json
{
  "session_id": "my-session",
  "conversation_history": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "user_prompt": "Generate a portrait",
      "chatbot_response": "Here's your portrait!",
      "generated_media_urls": ["https://storage.eachlabs.ai/outputs/abc.png"]
    }
  ],
  "total_exchanges": 1,
  "generated_media_urls": ["https://storage.eachlabs.ai/outputs/abc.png"]
}
```

### DELETE /memory

Clear conversation memory for a session.

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `session_id` (optional): Session ID to clear

**Response:**
```json
{
  "cleared": true,
  "session_id": "my-session"
}
```

### GET /sessions

List all active sessions for the authenticated user.

**Headers:**
```
X-API-Key: your_api_key_here
```

**Response:**
```json
{
  "sessions": ["session-1", "session-2", "default"]
}
```

---

## Rate Limits

- Depends on your Eachlabs API key tier
- Streaming connections timeout after 15 minutes of inactivity
- Workflow executions timeout after 15 minutes

---

## Client Implementation Notes

### JavaScript/TypeScript (EventSource)
```javascript
const eventSource = new EventSource('/chat?' + params);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close();
    return;
  }

  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'thinking_delta':
      // Append to thinking display
      break;
    case 'generation_response':
      // Display generated media
      console.log('Generated:', data.url);
      break;
    case 'clarification_needed':
      // Show clarification UI
      break;
    case 'complete':
      // Handle completion
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.message);
      eventSource.close();
      break;
  }
};
```

### Python (requests)
```python
import requests
import json

response = requests.post(
    'https://api.example.com/chat',
    headers={'X-API-Key': 'your_key', 'Accept': 'text/event-stream'},
    json={'message': 'Generate a portrait', 'stream': True},
    stream=True
)

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                break
            event = json.loads(data)
            print(event['type'], event)
```
