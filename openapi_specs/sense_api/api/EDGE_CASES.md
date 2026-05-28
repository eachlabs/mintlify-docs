# Edge Cases & Error Handling

Comprehensive guide for handling errors, edge cases, and special scenarios.

---

## Table of Contents

- [Error Types](#error-types)
- [HTTP Status Codes](#http-status-codes)
- [Streaming Errors](#streaming-errors)
- [Timeout Handling](#timeout-handling)
- [Rate Limiting](#rate-limiting)
- [Balance & Billing](#balance--billing)
- [NSFW Content](#nsfw-content)
- [Input Validation](#input-validation)
- [Model-Specific Edge Cases](#model-specific-edge-cases)
- [Network & Retry](#network--retry)
- [Session Edge Cases](#session-edge-cases)

---

## Error Types

### Authentication Errors

#### Missing API Key

```json
{
  "detail": "API key is required."
}
```
**HTTP Status:** 401

**Solution:** Include `X-API-Key` header or `Authorization: Bearer` header.

#### Invalid API Key

```json
{
  "detail": "Invalid API key. Please check your API key and try again."
}
```
**HTTP Status:** 401

**Solution:** Verify your API key at https://eachlabs.ai/settings/api-keys

#### Expired API Key

```json
{
  "detail": "API key has expired. Please generate a new key."
}
```
**HTTP Status:** 401

**Solution:** Generate new API key from dashboard.

---

### Validation Errors

#### Invalid Request Body

```json
{
  "detail": [
    {
      "loc": ["body", "messages"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```
**HTTP Status:** 422

#### Invalid Message Format

```json
{
  "detail": "messages[0].role must be 'user', 'assistant', or 'system'"
}
```
**HTTP Status:** 422

#### Invalid Image URL

```json
{
  "type": "error",
  "message": "Invalid image URL: Unable to fetch image from provided URL"
}
```

#### Too Many Images

```json
{
  "type": "error",
  "message": "Maximum 4 images allowed per request"
}
```

---

### Model Errors

#### Model Not Found

```json
{
  "type": "error",
  "message": "Model not found: invalid-model-name",
  "suggestion": "Did you mean 'nano-banana-pro'?"
}
```

#### Invalid Model Parameters

```json
{
  "type": "error",
  "message": "Invalid parameters for model nano-banana-pro: 'invalid_param' is not a valid parameter",
  "valid_parameters": ["prompt", "aspect_ratio", "negative_prompt", "seed"]
}
```

#### Model Unavailable

```json
{
  "type": "error",
  "message": "Model temporarily unavailable: kling-3-0. Please try again later or use an alternative model.",
  "alternatives": ["kling-2-1", "veo3-1-image-to-video"]
}
```

---

### Execution Errors

#### Generation Failed

```json
{
  "type": "error",
  "message": "Failed to generate image: Model returned error",
  "details": {
    "model": "nano-banana-pro",
    "error_code": "CONTENT_FILTER",
    "description": "Content was filtered by safety system"
  }
}
```

#### Execution Timeout

```json
{
  "type": "error",
  "message": "Model execution timed out after 300 seconds",
  "model": "veo-3",
  "execution_id": "exec_abc123"
}
```

---

## HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed |
| 400 | Bad Request | Malformed JSON, invalid parameters |
| 401 | Unauthorized | Missing/invalid API key |
| 403 | Forbidden | API key lacks permission |
| 404 | Not Found | Invalid endpoint |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Unavailable | Service temporarily down |
| 504 | Gateway Timeout | Request timed out |

---

## Streaming Errors

### Error Event in Stream

When an error occurs during streaming, an error event is emitted:

```
data: {"type":"status","message":"Generating image..."}

data: {"type":"error","message":"Generation failed: Insufficient balance"}

data: [DONE]
```

The stream ALWAYS terminates after an error event.

### Handling Streaming Errors

```javascript
function handleEvent(event) {
  if (event.type === 'error') {
    // Stop processing, show error to user
    showError(event.message);

    // Check for specific error types
    if (event.error_code === 'INSUFFICIENT_BALANCE') {
      showTopUpPrompt();
    } else if (event.error_code === 'RATE_LIMITED') {
      scheduleRetry(event.retry_after);
    }

    return; // Don't process further events
  }

  // Normal event handling
}
```

### Connection Dropped

```javascript
async function streamWithReconnect(message) {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await stream(message);
      return; // Success
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('network')) {
        retries++;
        await sleep(Math.pow(2, retries) * 1000); // Exponential backoff
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded');
}
```

---

## Timeout Handling

### Timeout Values

| Operation | Timeout |
|-----------|---------|
| HTTP Connection | 30 seconds |
| HTTP Request | 300 seconds (5 min) |
| Streaming | 15 minutes idle |
| Image Generation | 10-60 seconds |
| Video Generation | 60-600 seconds |
| Workflow Execution | 15 minutes |

### Client-Side Timeout

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

try {
  const response = await fetch(url, {
    method: 'POST',
    signal: controller.signal,
    // ...
  });
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request timed out');
  }
} finally {
  clearTimeout(timeoutId);
}
```

### Server Timeout Response

```json
{
  "type": "error",
  "message": "Request timed out. The operation took longer than expected.",
  "error_code": "TIMEOUT",
  "execution_id": "exec_abc123",
  "suggestion": "For long-running operations, check execution status with the execution_id"
}
```

---

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708345678
```

### Rate Limit Error

```json
{
  "detail": "Rate limit exceeded. Please wait before making more requests.",
  "error_code": "RATE_LIMITED",
  "retry_after": 30
}
```
**HTTP Status:** 429

### Handling Rate Limits

```javascript
async function requestWithRateLimit(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '30');
    console.log(`Rate limited. Retrying in ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return requestWithRateLimit(url, options); // Retry
  }

  return response;
}
```

### Rate Limits by Plan

| Plan | Requests/min | Concurrent |
|------|--------------|------------|
| Free | 10 | 2 |
| Pro | 60 | 10 |
| Enterprise | 300 | 50 |

---

## Balance & Billing

### Insufficient Balance

```json
{
  "type": "error",
  "message": "Insufficient balance. Your current balance is $0.10, but this operation requires approximately $0.50.",
  "error_code": "INSUFFICIENT_BALANCE",
  "details": {
    "current_balance": 0.10,
    "required_estimate": 0.50,
    "top_up_url": "https://eachlabs.ai/billing"
  }
}
```

### Check Balance Before Request

```javascript
async function checkBalanceAndExecute(message) {
  // Get user info (includes balance)
  const userInfo = await validateApiKey();

  if (userInfo.balance_cents < 100) { // Less than $1
    showLowBalanceWarning();
  }

  // Proceed with request
  return await sendMessage(message);
}
```

### Billing Webhook (Enterprise)

```json
{
  "event": "balance.low",
  "user_id": "user_123",
  "current_balance": 5.00,
  "threshold": 10.00,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## NSFW Content

### NSFW Safety Filter (Default)

By default, NSFW content is filtered:

```json
{
  "type": "error",
  "message": "Content was filtered by safety system",
  "error_code": "CONTENT_FILTER"
}
```

### Enabling NSFW Generation

Set `enable_safety_checker: false`:

```json
{
  "messages": [{"role": "user", "content": "Generate artistic nude portrait"}],
  "enable_safety_checker": false
}
```

### NSFW-Capable Models

Only certain models support NSFW:

| Provider | Models |
|----------|--------|
| Alibaba Wan | wan-v2-6-*, wan-2-5-*, wan-2-2-* |
| ByteDance Seedream | seedream-*, omnihuman-* |

Other models will ignore `enable_safety_checker: false`.

### Age Verification Required

For enterprise integrations with NSFW:

```json
{
  "type": "error",
  "message": "NSFW content requires age verification",
  "error_code": "AGE_VERIFICATION_REQUIRED",
  "verification_url": "https://eachlabs.ai/verify-age"
}
```

---

## Input Validation

### Image URL Validation

**Supported formats:** JPEG, PNG, WebP, GIF (first frame)
**Max size:** 20MB
**Min dimensions:** 64x64 px
**Max dimensions:** 8192x8192 px

```json
{
  "type": "error",
  "message": "Invalid image: Dimensions 32x32 are below minimum 64x64"
}
```

### Video URL Validation

**Supported formats:** MP4, WebM, MOV
**Max size:** 500MB
**Max duration:** 10 minutes

```json
{
  "type": "error",
  "message": "Invalid video: Duration 15:00 exceeds maximum 10:00"
}
```

### Audio URL Validation

**Supported formats:** MP3, WAV, M4A, OGG
**Max size:** 50MB
**Max duration:** 5 minutes (for lip sync)

### Prompt Validation

**Max length:** 10,000 characters
**Language:** Any (UTF-8)

```json
{
  "type": "error",
  "message": "Prompt exceeds maximum length of 10,000 characters"
}
```

### Aspect Ratio Validation

**Image ratios:** 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16

**Video ratios:** 16:9, 9:16

```json
{
  "type": "error",
  "message": "Invalid aspect ratio '7:5'. Supported ratios: 21:9, 16:9, 3:2, ..."
}
```

---

## Model-Specific Edge Cases

### Kling Models

**Face detection required:**
```json
{
  "type": "error",
  "message": "kling-face-swap requires a face in the source image. No face detected.",
  "model": "kling-face-swap"
}
```

**Motion brush conflicts:**
```json
{
  "type": "error",
  "message": "Motion brush regions overlap. Please ensure distinct regions.",
  "model": "kling-motion-brush"
}
```

### Flux Models

**Prompt too short:**
```json
{
  "type": "error",
  "message": "flux-2-max requires a prompt of at least 10 characters",
  "model": "flux-2-max"
}
```

### Video Generation

**Duration limits by model:**

| Model | Min | Max |
|-------|-----|-----|
| kling-2-1 | 3s | 10s |
| veo-3 | 3s | 8s |
| wan-v2-6 | 2s | 5s |
| pixverse-v4 | 3s | 15s |

---

## Network & Retry

### Retry Strategy

```javascript
async function requestWithRetry(url, options, maxRetries = 3) {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (retryableStatuses.includes(response.status)) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < maxRetries && isNetworkError(error)) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

function isNetworkError(error) {
  return (
    error.name === 'TypeError' ||
    error.message.includes('network') ||
    error.message.includes('fetch')
  );
}
```

### Idempotency

For non-streaming requests, include an idempotency key:

```bash
curl -X POST https://eachsense-agent.core.eachlabs.run/v1/chat/completions \
  -H "X-API-Key: YOUR_KEY" \
  -H "X-Idempotency-Key: unique-request-id-123" \
  -d '{...}'
```

Duplicate requests with the same idempotency key return the cached response.

---

## Session Edge Cases

### Session Not Found

```json
{
  "type": "error",
  "message": "Session not found: session_abc123",
  "error_code": "SESSION_NOT_FOUND"
}
```

This happens if:
- Session expired (15 minutes of inactivity)
- Session was explicitly cleared
- Different API key used

### Session Conflict

```json
{
  "type": "error",
  "message": "Session is currently processing another request",
  "error_code": "SESSION_BUSY",
  "suggestion": "Wait for the current request to complete or use a different session_id"
}
```

### Cross-User Session Access

Sessions are scoped by API key. Attempting to access another user's session:

```json
{
  "type": "error",
  "message": "Session not found",
  "error_code": "SESSION_NOT_FOUND"
}
```

(Returns generic "not found" to avoid information disclosure)

### Session Memory Limit

```json
{
  "type": "error",
  "message": "Session memory limit reached. Maximum 50 messages per session.",
  "suggestion": "Start a new session or clear history with DELETE /memory"
}
```

---

## Debugging

### Enable Debug Mode

```json
{
  "messages": [{"role": "user", "content": "Generate a portrait"}],
  "debug": true
}
```

Response includes additional debug info:

```json
{
  "type": "complete",
  "debug": {
    "model_selection": {
      "query": "portrait generation",
      "candidates": ["nano-banana-pro", "flux-2-max", "seedream-4-5"],
      "selected": "nano-banana-pro",
      "reason": "Best match for photorealistic portraits"
    },
    "timing": {
      "query_understanding_ms": 150,
      "model_search_ms": 45,
      "model_execution_ms": 12500,
      "total_ms": 12750
    },
    "tokens": {
      "prompt": 125,
      "completion": 85
    }
  }
}
```

### Request ID

Every response includes a request ID for support:

```http
X-Request-Id: req_abc123xyz
```

When contacting support, include this ID.
