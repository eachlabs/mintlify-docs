---
title: "Fallback Configuration"
description: "Automatic retry with alternative models when the primary model fails."
---

## Overview

Model steps support an optional fallback that automatically retries with an alternative model if the primary model fails. This keeps your workflow humming along even during temporary outages or rate limits.

## How It Works

1. **Execute the primary model** with configured parameters
2. **If primary fails**, automatically execute the fallback model
3. **If both fail**, mark the step as failed

## Configuration

Add a `fallback` object to any model step:

```json
{
  "step_id": "generate_image",
  "type": "model",
  "model": "flux-dev",
  "params": {
    "prompt": "{{inputs.prompt}}",
    "num_images": 1
  },
  "fallback": {
    "enabled": true,
    "model": "flux-1-1-pro",
    "params": {
      "prompt": "{{inputs.prompt}}",
      "guidance_scale": 7.5
    }
  }
}
```

## Fallback Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable fallback |
| `model` | string | `-` | Alternative model slug |
| `version` | string | Primary version | Fallback model version |
| `params` | object | `-` | Parameters for the fallback model (supports template variables) |

## Detecting Fallback Usage

When a fallback is used, the step metadata includes:

```json
{
  "step_id": "generate_image",
  "status": "completed",
  "output": "https://storage.googleapis.com/uploads/image.png",
  "metadata": {
    "model": "flux-1-1-pro",
    "fallback_used": true,
    "primary_error": "Primary model flux-dev failed: rate limit exceeded"
  }
}
```

| Field | Description |
|-------|-------------|
| `fallback_used` | `true` when step completed using fallback |
| `primary_error` | Why the primary model failed |

## Best Practices

- Choose fallback models that produce compatible output formats
- Use fallback for critical production workflows
- Monitor `fallback_used` in execution results to identify recurring primary failures
- Consider cost differences between primary and fallback models
