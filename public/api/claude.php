<?php
// Never render PHP errors into the response: this file holds the API key and
// error output can leak it (or server paths) to the browser. Log instead.
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Buffer all output. Some shared hosts force display_errors=On, and any notice
// printed before our JSON makes the response unparseable for the browser
// (response.json() throws). We discard the buffer right before emitting JSON.
ob_start();

header("Content-Type: application/json");

// Allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

/**
 * Emit a JSON response, discarding anything already buffered (stray PHP notices,
 * BOMs, host-injected output) so the body is always valid JSON.
 */
function send_json(array $payload, int $status = 200): void
{
    if (ob_get_level() > 0) {
        ob_clean();
    }
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

// Read raw POST data
$inputData = json_decode(file_get_contents('php://input'), true);
$prompt = isset($inputData['prompt']) ? $inputData['prompt'] : '';

if (empty($prompt)) {
    send_json(["error" => "Prompt is required."], 400);
}

// This placeholder will be replaced by GitHub Actions during deployment
$apiKey = "CLAUDE_API_KEY_PLACEHOLDER";

// Fallback for local development: if placeholder is not replaced, try to read from environment
if ($apiKey === "CLAUDE_API_KEY_PLACEHOLDER") {
    $apiKey = getenv("ANTHROPIC_API_KEY") ?: "";
}

if (empty($apiKey)) {
    send_json(["error" => "API Key not configured."], 500);
}

// Keep this model id in sync with CLAUDE_MODEL in services/claudeService.ts.
$payload = [
    "model" => "claude-haiku-4-5",
    "max_tokens" => 1024,
    "messages" => [
        [
            "role" => "user",
            "content" => $prompt
        ]
    ]
];

// Use file_get_contents instead of cURL to be compatible with all hosting servers (like One.com/OVH)
// that may have the PHP cURL extension disabled.
$options = [
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/json\r\n" .
                    "x-api-key: " . $apiKey . "\r\n" .
                    "anthropic-version: 2023-06-01\r\n",
        "content" => json_encode($payload),
        "ignore_errors" => true, // Allows us to see the error payload from Anthropic if the status is not 200
        "timeout" => 15
    ]
];

$context = stream_context_create($options);
$response = @file_get_contents("https://api.anthropic.com/v1/messages", false, $context);

if ($response === false) {
    $error = error_get_last();
    send_json(["error" => "HTTP request failed: " . ($error['message'] ?? 'Unknown error')], 502);
}

$responseData = json_decode($response, true);

if (!is_array($responseData)) {
    send_json(["error" => "Unreadable response from Claude API."], 502);
}

// Detect failure from the payload rather than the response headers: Anthropic always
// returns {"type":"error","error":{...}} on a non-2xx, and the legacy
// $http_response_header variable is deprecated on PHP 8.4+ — reading it emits notices
// that would corrupt this JSON response on hosts with display_errors enabled.
if (isset($responseData['error'])) {
    send_json([
        "error" => $responseData['error']['message'] ?? 'Claude API error',
        "type"  => $responseData['error']['type'] ?? 'api_error',
    ], 502);
}

$content = isset($responseData['content'][0]['text']) ? $responseData['content'][0]['text'] : '';

send_json(["analysis" => $content]);
