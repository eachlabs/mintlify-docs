# Tools Reference

Complete reference for all 11 tools available to the AI agent.

---

## Overview

The agent uses tools to perform actions. Tools are categorized as:

- **Non-Terminal**: Results feed back to the agent for further processing
- **Terminal**: Execution completes after this tool

---

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Search** | `search_models`, `get_model_details`, `web_search` | Find models and information |
| **Analysis** | `vision_preprocessor` | Analyze image content |
| **Execution** | `execute_model`, `generate_text` | Run models |
| **Workflow** | `create_workflow`, `trigger_workflow`, `build_workflow`, `check_execution` | Workflow operations |
| **Interaction** | `ask_clarification` | User communication |

---

## 1. search_models

**Type:** Non-Terminal

Search for AI models matching a use case.

### Input

```json
{
  "use_case": "generate portrait photo from text"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `use_case` | string | Yes | Description of what you want to do |

### Output

```json
{
  "content": "Found 5 models for portrait generation:\n1. nano-banana-pro - Best for photorealistic portraits...",
  "metadata": {
    "tool": "search_models",
    "source": "chunked_vector_db",
    "tier": 0,
    "query": "generate portrait photo from text",
    "count": 5,
    "models": [
      {
        "name": "nano-banana-pro",
        "category": "text-to-image",
        "description": "High-quality photorealistic image generation",
        "score": 0.95,
        "is_curated": true
      },
      {
        "name": "flux-2-max",
        "category": "text-to-image",
        "description": "Premium quality image generation",
        "score": 0.92,
        "is_curated": true
      }
    ]
  }
}
```

### Search Tiers

| Tier | Method | Latency | Description |
|------|--------|---------|-------------|
| 0 | Chunked + LLM | 200-400ms | OpenAI embeddings + query understanding |
| 1 | Legacy + Curated | 10-50ms | ~200 curated models |
| 1.5 | Legacy + All | 50-100ms | All 500+ models |
| 2 | Agent API | 200-500ms | Eachlabs discovery API |
| 3 | Legacy API | 500-1500ms | Fallback |

---

## 2. get_model_details

**Type:** Non-Terminal

Get detailed input schema for a specific model.

### Input

```json
{
  "model_name": "nano-banana-pro"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_name` | string | Yes | Model slug/name |

### Output

```json
{
  "content": "Model: nano-banana-pro\n\nInput Parameters:\n- prompt (required): Text description...",
  "metadata": {
    "tool": "get_model_details",
    "model_name": "nano-banana-pro",
    "input_schema": {
      "prompt": {
        "type": "string",
        "required": true,
        "description": "Text description of the image to generate"
      },
      "aspect_ratio": {
        "type": "string",
        "required": false,
        "default": "1:1",
        "enum": ["1:1", "16:9", "9:16", "4:3", "3:4"]
      },
      "negative_prompt": {
        "type": "string",
        "required": false,
        "description": "What to avoid in the image"
      },
      "seed": {
        "type": "integer",
        "required": false,
        "description": "Random seed for reproducibility"
      }
    },
    "agent_info": "Full documentation markdown..."
  }
}
```

---

## 3. web_search

**Type:** Non-Terminal

Search the web for information using Perplexity.

### Input

```json
{
  "query": "latest Flux model features 2024",
  "recency": "month",
  "max_tokens": 500
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `recency` | string | No | "month" | Time filter: day, week, month, year |
| `max_tokens` | integer | No | 500 | Max response length |

### Output

```json
{
  "content": "Based on recent information:\n\nFlux 2 Max was released in January 2024 with improved...",
  "metadata": {
    "tool": "web_search",
    "query": "latest Flux model features 2024",
    "citations": [
      {
        "title": "Flux 2 Max Release Notes",
        "url": "https://example.com/flux-2-max",
        "snippet": "Flux 2 Max introduces..."
      }
    ]
  }
}
```

---

## 4. vision_preprocessor

**Type:** Non-Terminal

Analyze image content before processing.

### Input

```json
{
  "image_urls": ["https://example.com/photo.jpg"],
  "user_text": "I want to edit this photo"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image_urls` | string[] | Yes | URLs of images to analyze |
| `user_text` | string | No | User's intention |

### Output

```json
{
  "content": "Image Analysis:\n- Subject: Portrait of a woman\n- Style: Professional headshot\n- Quality: High resolution (2048x2048)\n- Background: Gray studio backdrop\n- Face detected: Yes, centered\n- Suitable for: Face swap, style transfer, animation",
  "metadata": {
    "tool": "vision_preprocessor",
    "images_analyzed": 1,
    "analysis": {
      "subjects": ["person", "portrait"],
      "style": "professional",
      "quality": "high",
      "dimensions": [2048, 2048],
      "face_detected": true,
      "face_count": 1,
      "suggested_operations": ["face_swap", "style_transfer", "animation", "background_removal"]
    }
  }
}
```

---

## 5. execute_model

**Type:** Terminal

Execute a model with specific inputs.

### Input

```json
{
  "model_name": "nano-banana-pro",
  "inputs": {
    "prompt": "Professional headshot of a woman, natural lighting, gray background",
    "aspect_ratio": "1:1",
    "negative_prompt": "blurry, low quality"
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_name` | string | Yes | Model to execute |
| `inputs` | object | Yes | Model-specific parameters |

### Output

```json
{
  "content": "Generated successfully!",
  "metadata": {
    "tool": "execute_model",
    "model": "nano-banana-pro",
    "url": "https://storage.eachlabs.ai/generations/abc123.png",
    "execution_time_ms": 12500,
    "prediction_id": "pred_xyz789"
  }
}
```

### Streaming Events

```
data: {"type":"status","message":"Executing nano-banana-pro...","tool_name":"execute_model"}

data: {"type":"generation_response","url":"https://...","model":"nano-banana-pro"}

data: {"type":"complete","status":"ok","generations":["https://..."]}
```

---

## 6. generate_text

**Type:** Terminal

Generate text response without media.

### Input

```json
{
  "message": "Explain the difference between Flux and Stable Diffusion"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Text to generate |

### Output

```json
{
  "content": "Flux and Stable Diffusion are both text-to-image AI models, but they differ in several ways:\n\n1. **Architecture**: Flux uses a flow-matching architecture while Stable Diffusion uses latent diffusion...",
  "metadata": {
    "tool": "generate_text",
    "tokens_used": {
      "prompt": 50,
      "completion": 200
    }
  }
}
```

---

## 7. create_workflow

**Type:** Non-Terminal

Create a new multi-step workflow.

### Input

```json
{
  "name": "portrait-to-video",
  "description": "Generate portrait and animate into video",
  "input_schema": {
    "description": {
      "type": "string",
      "description": "Person description",
      "required": true
    },
    "duration": {
      "type": "integer",
      "default": 5
    }
  },
  "steps": [
    {
      "id": "step1",
      "name": "Generate Portrait",
      "model": "nano-banana-pro",
      "params": {
        "prompt": "$.inputs.description, portrait photo"
      }
    },
    {
      "id": "step2",
      "name": "Animate",
      "model": "kling-2-1-image-to-video",
      "params": {
        "image": "$.step1.primary",
        "duration": "$.inputs.duration"
      }
    }
  ]
}
```

### Output

```json
{
  "content": "Workflow created: portrait-to-video",
  "metadata": {
    "tool": "create_workflow",
    "workflow_id": "wf_abc123",
    "version_id": "v1",
    "steps_count": 2,
    "input_schema": {...}
  }
}
```

---

## 8. trigger_workflow

**Type:** Non-Terminal

Start execution of a workflow.

### Input

```json
{
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "inputs": {
    "description": "Professional woman, 30s, confident smile",
    "duration": 10
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflow_id` | string | Yes | Workflow to execute |
| `version_id` | string | Yes | Version to execute |
| `inputs` | object | Yes | Input values |

### Output

```json
{
  "content": "Workflow execution started",
  "metadata": {
    "tool": "trigger_workflow",
    "execution_id": "exec_xyz789",
    "workflow_id": "wf_abc123",
    "status": "running"
  }
}
```

---

## 9. build_workflow

**Type:** Terminal

Build or update a workflow definition.

### Input

```json
{
  "workflow_id": "wf_abc123",
  "version_id": "v1",
  "steps": [...],
  "input_schema": {...}
}
```

### Output

```json
{
  "content": "Workflow updated successfully",
  "metadata": {
    "tool": "build_workflow",
    "workflow_id": "wf_abc123",
    "version_id": "v2",
    "steps_count": 3,
    "definition": {...}
  }
}
```

---

## 10. check_execution

**Type:** Terminal

Check status and get results of workflow execution.

### Input

```json
{
  "execution_id": "exec_xyz789"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `execution_id` | string | Yes | Execution to check |

### Output (In Progress)

```json
{
  "content": "Execution in progress: 2/4 steps completed",
  "metadata": {
    "tool": "check_execution",
    "execution_id": "exec_xyz789",
    "status": "running",
    "completed_steps": 2,
    "total_steps": 4,
    "current_step": "step3"
  }
}
```

### Output (Completed)

```json
{
  "content": "Execution completed!",
  "metadata": {
    "tool": "check_execution",
    "execution_id": "exec_xyz789",
    "status": "completed",
    "output": "https://storage.eachlabs.ai/final.mp4",
    "all_outputs": {
      "step1": "https://storage.eachlabs.ai/portrait.png",
      "step2": "https://storage.eachlabs.ai/video.mp4",
      "step3": "https://storage.eachlabs.ai/upscaled.mp4",
      "step4": "https://storage.eachlabs.ai/final.mp4"
    },
    "total_time_ms": 185000
  }
}
```

---

## 11. ask_clarification

**Type:** Terminal

Ask the user for more information.

### Input

```json
{
  "question": "What style would you like for your portrait?",
  "options": [
    "Photorealistic - Natural appearance",
    "Artistic - Painterly look",
    "Anime - Japanese animation style",
    "Cinematic - Movie poster aesthetic"
  ],
  "context": "I can generate your portrait in several styles. Each produces very different results."
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | Question to ask |
| `options` | string[] | No | Suggested options |
| `context` | string | No | Additional context |

### Output

The agent yields a `clarification_needed` event and waits for user response.

```json
{
  "type": "clarification_needed",
  "question": "What style would you like for your portrait?",
  "options": [...],
  "context": "...",
  "requires_response": true
}
```

---

## Tool Execution Flow

### Non-Terminal Tools

```
User Request
     │
     ▼
┌─────────────────┐
│  Claude Agent   │
│  Decides Tool   │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Execute Tool    │ ◄── Non-Terminal (search_models, etc.)
│ (e.g. search)   │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Result Back to  │
│ Claude Agent    │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Claude Decides  │
│ Next Action     │
└─────────────────┘
     │
     ▼
   (loop or terminal tool)
```

### Terminal Tools

```
User Request
     │
     ▼
┌─────────────────┐
│  Claude Agent   │
│  Decides Tool   │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Execute Tool    │ ◄── Terminal (execute_model, etc.)
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Yield Result    │
│ End Execution   │
└─────────────────┘
```

---

## Tool Chaining Examples

### Image Generation

```
1. search_models("portrait generation")     → finds nano-banana-pro
2. get_model_details("nano-banana-pro")     → gets input schema
3. execute_model("nano-banana-pro", {...})  → generates image [TERMINAL]
```

### Image Analysis + Edit

```
1. vision_preprocessor([image_url])         → analyzes image
2. search_models("remove background")       → finds bg remover
3. execute_model("eachlabs-bg-remover-v1")  → removes bg [TERMINAL]
```

### Workflow Creation + Execution

```
1. search_models("portrait generation")     → finds models
2. search_models("image to video")          → finds more models
3. create_workflow({...})                   → creates workflow
4. trigger_workflow(...)                    → starts execution
5. check_execution(...)                     → monitors progress [TERMINAL]
```

### With Clarification

```
1. ask_clarification("What style?", [...])  → asks user [TERMINAL]
   (user responds)
2. search_models("anime portrait")          → finds models
3. execute_model("wan-v2-6-text-to-image")  → generates [TERMINAL]
```

---

## Model Slug Aliases

The agent automatically resolves common aliases:

| User Says | Resolves To |
|-----------|-------------|
| "flux max" | flux-2-max |
| "flux pro" | flux-2-pro |
| "nano banana" | nano-banana-pro |
| "gpt image" | gpt-image-1-5 |
| "seedream" | seedream-v4-5-text-to-image |
| "kling 3" | kling-3-0 |
| "kling video" | kling-2-1-image-to-video |
| "veo" | veo3-1-text-to-video-fast |
| "wan video" | wan-v2-6-image-to-video |
