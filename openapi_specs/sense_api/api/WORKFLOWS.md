# Workflows

Complete guide to creating, triggering, and managing multi-step AI workflows.

---

## Overview

Workflows allow you to chain multiple AI models together into automated pipelines. For example:

```
Text Prompt → Image Generation → Video Animation → Upscaling → Subtitles
```

The agent can:
1. **Create** new workflows from natural language descriptions
2. **Execute** workflows with provided inputs
3. **Update** existing workflows to add or modify steps
4. **Monitor** execution progress in real-time

---

## Workflow Structure

### Workflow Definition

```json
{
  "workflow_id": "wf_portrait_video",
  "version_id": "v1",
  "name": "portrait-to-video",
  "description": "Generate a portrait and animate it into a video",
  "input_schema": {
    "description": {
      "type": "string",
      "description": "Description of the person",
      "required": true
    },
    "style": {
      "type": "string",
      "enum": ["realistic", "anime", "artistic"],
      "default": "realistic"
    },
    "duration": {
      "type": "integer",
      "minimum": 3,
      "maximum": 30,
      "default": 5
    }
  },
  "steps": [
    {
      "id": "step1",
      "name": "Generate Portrait",
      "model": "nano-banana-pro",
      "params": {
        "prompt": "$.inputs.description, $.inputs.style style portrait",
        "aspect_ratio": "1:1"
      }
    },
    {
      "id": "step2",
      "name": "Animate Portrait",
      "model": "kling-2-1-image-to-video",
      "params": {
        "image": "$.step1.primary",
        "duration": "$.inputs.duration",
        "motion_mode": "natural"
      }
    },
    {
      "id": "step3",
      "name": "Upscale Video",
      "model": "topaz-upscale-video",
      "params": {
        "video": "$.step2.primary",
        "scale": 2
      }
    }
  ]
}
```

### Parameter References

Use `$` syntax to reference inputs and previous step outputs:

| Reference | Description |
|-----------|-------------|
| `$.inputs.{field}` | Reference workflow input field |
| `$.step{N}.primary` | Primary output of step N |
| `$.step{N}.outputs.{field}` | Specific output field of step N |

**Examples:**
```json
{
  "prompt": "$.inputs.description",          // Input field
  "image": "$.step1.primary",                // Previous step output
  "audio": "$.step2.outputs.audio_url",      // Specific output field
  "text": "A portrait of $.inputs.name"      // Embedded in string
}
```

---

## Creating Workflows

### Via Natural Language

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a workflow that: 1) Generates a portrait from description, 2) Animates it into a 5-second video, 3) Adds lip sync with provided audio"
    }],
    "stream": true
  }'
```

### Response Events

```
data: {"type":"status","message":"Creating workflow..."}

data: {"type":"workflow_created","workflow_id":"wf_abc123","version_id":"v1","input_schema":{...},"steps_count":3}

data: {"type":"text_response","content":"I've created your workflow! It requires: description (text), audio_url (URL to audio file)."}

data: {"type":"complete","status":"ok","workflow_id":"wf_abc123"}

data: [DONE]
```

### Via `/workflow` Endpoint

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/workflow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Create a UGC video workflow with consistent presenter",
    "stream": true
  }'
```

---

## Executing Workflows

### Method 1: Natural Language

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Run my portrait-to-video workflow with description=\"Professional woman, 30s, confident smile\", duration=10"
    }],
    "stream": true
  }'
```

### Method 2: With Workflow ID

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Execute this workflow with description: Professional headshot, style: realistic"
    }],
    "workflow_id": "wf_abc123",
    "version_id": "v1",
    "stream": true
  }'
```

### Execution Response Events

```
data: {"type":"execution_started","execution_id":"exec_xyz789","workflow_id":"wf_abc123"}

data: {"type":"execution_progress","step_id":"step1","step_status":"running","model":"nano-banana-pro","completed_steps":0,"total_steps":3}

data: {"type":"execution_progress","step_id":"step1","step_status":"completed","output":"https://storage.eachlabs.ai/portrait.png","completed_steps":1,"total_steps":3}

data: {"type":"execution_progress","step_id":"step2","step_status":"running","model":"kling-2-1-image-to-video","completed_steps":1,"total_steps":3}

data: {"type":"execution_progress","step_id":"step2","step_status":"completed","output":"https://storage.eachlabs.ai/video.mp4","completed_steps":2,"total_steps":3}

data: {"type":"execution_progress","step_id":"step3","step_status":"running","model":"topaz-upscale-video","completed_steps":2,"total_steps":3}

data: {"type":"execution_progress","step_id":"step3","step_status":"completed","output":"https://storage.eachlabs.ai/final.mp4","completed_steps":3,"total_steps":3}

data: {"type":"execution_completed","execution_id":"exec_xyz789","status":"completed","output":"https://storage.eachlabs.ai/final.mp4","all_outputs":{"step1":"https://...","step2":"https://...","step3":"https://..."}}

data: {"type":"complete","status":"ok"}

data: [DONE]
```

---

## Updating Workflows

### Add Steps to Existing Workflow

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/workflow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "message": "Add a final step to generate subtitles from the video audio",
    "workflow_id": "wf_abc123",
    "version_id": "v1",
    "stream": true
  }'
```

### Response Events

```
data: {"type":"workflow_fetched","workflow_name":"portrait-to-video","existing_steps":3}

data: {"type":"status","message":"Analyzing workflow modification..."}

data: {"type":"workflow_built","steps_count":4,"definition":{...}}

data: {"type":"workflow_updated","success":true,"workflow_id":"wf_abc123","version_id":"v2"}

data: {"type":"complete","status":"ok"}

data: [DONE]
```

### Modify Existing Steps

```json
{
  "message": "Change step 2 to use Veo 3 instead of Kling for better quality",
  "workflow_id": "wf_abc123",
  "version_id": "v2"
}
```

---

## Workflow Input Types

### Text Input

```json
{
  "description": {
    "type": "string",
    "description": "Description of the content",
    "required": true,
    "maxLength": 1000
  }
}
```

### Enum (Select)

```json
{
  "style": {
    "type": "string",
    "enum": ["realistic", "anime", "artistic", "cinematic"],
    "default": "realistic"
  }
}
```

### Number

```json
{
  "duration": {
    "type": "integer",
    "minimum": 3,
    "maximum": 60,
    "default": 5,
    "description": "Video duration in seconds"
  }
}
```

### URL (Image/Video/Audio)

```json
{
  "reference_image": {
    "type": "string",
    "format": "uri",
    "description": "URL to reference image"
  }
}
```

### Boolean

```json
{
  "add_watermark": {
    "type": "boolean",
    "default": false,
    "description": "Whether to add watermark"
  }
}
```

### Array

```json
{
  "tags": {
    "type": "array",
    "items": {"type": "string"},
    "maxItems": 10,
    "description": "Tags for the content"
  }
}
```

---

## Example Workflows

### 1. UGC Video Creator

```json
{
  "name": "ugc-video-creator",
  "description": "Create UGC-style product video with AI presenter",
  "input_schema": {
    "product_description": {"type": "string", "required": true},
    "presenter_description": {"type": "string", "required": true},
    "script": {"type": "string", "required": true},
    "duration": {"type": "integer", "default": 30}
  },
  "steps": [
    {
      "id": "step1",
      "name": "Generate Presenter",
      "model": "nano-banana-pro",
      "params": {
        "prompt": "$.inputs.presenter_description, portrait photo, natural lighting",
        "aspect_ratio": "9:16"
      }
    },
    {
      "id": "step2",
      "name": "Generate Voice",
      "model": "elevenlabs-text-to-speech",
      "params": {
        "text": "$.inputs.script",
        "voice": "rachel"
      }
    },
    {
      "id": "step3",
      "name": "Animate with Lip Sync",
      "model": "kling-lip-sync",
      "params": {
        "image": "$.step1.primary",
        "audio": "$.step2.primary"
      }
    },
    {
      "id": "step4",
      "name": "Add Subtitles",
      "model": "auto-subtitle",
      "params": {
        "video": "$.step3.primary",
        "style": "tiktok"
      }
    }
  ]
}
```

### 2. Product Photo Enhancement

```json
{
  "name": "product-photo-enhance",
  "description": "Enhance product photos for e-commerce",
  "input_schema": {
    "product_image": {"type": "string", "format": "uri", "required": true},
    "background": {"type": "string", "default": "white studio"},
    "enhance_level": {"type": "string", "enum": ["subtle", "moderate", "dramatic"], "default": "moderate"}
  },
  "steps": [
    {
      "id": "step1",
      "name": "Remove Background",
      "model": "eachlabs-bg-remover-v1",
      "params": {
        "image": "$.inputs.product_image"
      }
    },
    {
      "id": "step2",
      "name": "Generate New Background",
      "model": "flux-fill-pro",
      "params": {
        "image": "$.step1.primary",
        "prompt": "$.inputs.background, professional product photography"
      }
    },
    {
      "id": "step3",
      "name": "Upscale",
      "model": "topaz-upscale-image",
      "params": {
        "image": "$.step2.primary",
        "scale": 2
      }
    }
  ]
}
```

### 3. Social Media Content Pack

```json
{
  "name": "social-content-pack",
  "description": "Generate content for multiple social platforms",
  "input_schema": {
    "topic": {"type": "string", "required": true},
    "brand_style": {"type": "string", "default": "modern minimal"}
  },
  "steps": [
    {
      "id": "step1",
      "name": "Generate Base Image",
      "model": "flux-2-max",
      "params": {
        "prompt": "$.inputs.topic, $.inputs.brand_style, professional",
        "aspect_ratio": "1:1"
      }
    },
    {
      "id": "step2",
      "name": "Instagram Story Version",
      "model": "flux-expand",
      "params": {
        "image": "$.step1.primary",
        "target_ratio": "9:16"
      }
    },
    {
      "id": "step3",
      "name": "YouTube Thumbnail",
      "model": "flux-expand",
      "params": {
        "image": "$.step1.primary",
        "target_ratio": "16:9"
      }
    },
    {
      "id": "step4",
      "name": "Short Video",
      "model": "kling-2-1-image-to-video",
      "params": {
        "image": "$.step1.primary",
        "duration": 5
      }
    }
  ]
}
```

---

## Error Handling

### Step Failure

If a step fails, execution stops and returns an error:

```json
{
  "type": "execution_completed",
  "execution_id": "exec_xyz789",
  "status": "failed",
  "error": {
    "step_id": "step2",
    "message": "Model execution failed: Invalid image format",
    "model": "kling-2-1-image-to-video"
  },
  "partial_outputs": {
    "step1": "https://storage.eachlabs.ai/portrait.png"
  }
}
```

### Retrying Failed Executions

```json
{
  "message": "Retry the failed workflow with the same inputs",
  "workflow_id": "wf_abc123",
  "execution_id": "exec_xyz789"
}
```

### Timeout

Workflow execution times out after 15 minutes. For long workflows:

```json
{
  "type": "execution_progress",
  "step_id": "step3",
  "step_status": "timeout",
  "message": "Step execution timed out after 10 minutes",
  "partial_outputs": {...}
}
```

---

## Monitoring Executions

### Check Execution Status

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Check the status of execution exec_xyz789"
    }]
  }'
```

### Via Tool Call

The agent uses `check_execution` tool:

```json
{
  "type": "tool_call",
  "name": "check_execution",
  "input": {
    "execution_id": "exec_xyz789"
  }
}
```

---

## Best Practices

### 1. Use Descriptive Step Names

```json
{
  "id": "step1",
  "name": "Generate Product Image",  // Good
  // "name": "step1"                 // Bad
}
```

### 2. Set Reasonable Defaults

```json
{
  "duration": {
    "type": "integer",
    "default": 5,  // Sensible default
    "minimum": 3,
    "maximum": 60
  }
}
```

### 3. Validate Inputs

Use `enum` for constrained choices:

```json
{
  "quality": {
    "type": "string",
    "enum": ["draft", "standard", "high", "ultra"]
  }
}
```

### 4. Document Input Schema

```json
{
  "audio_url": {
    "type": "string",
    "format": "uri",
    "description": "URL to MP3 or WAV audio file (max 5 minutes)"
  }
}
```

### 5. Handle Intermediate Outputs

Access intermediate results for debugging:

```json
{
  "message": "Show me the output from step 2 of the last execution",
  "execution_id": "exec_xyz789"
}
```

---

## Pricing

Workflow execution costs are the sum of individual model costs:

| Model | Approximate Cost |
|-------|-----------------|
| nano-banana-pro | $0.02 |
| flux-2-max | $0.05 |
| kling-2-1-image-to-video | $0.50 |
| topaz-upscale-video | $0.10 |
| auto-subtitle | $0.05 |

**Example 3-step workflow:**
- Step 1 (nano-banana-pro): $0.02
- Step 2 (kling-2-1-image-to-video): $0.50
- Step 3 (auto-subtitle): $0.05
- **Total: ~$0.57**
