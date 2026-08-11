<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");

// Allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Read raw POST data
$inputData = json_decode(file_get_contents('php://input'), true);
$prompt = isset($inputData['prompt']) ? $inputData['prompt'] : '';

if (empty($prompt)) {
    http_response_code(400);
    echo json_encode(["error" => "Prompt is required."]);
    exit;
}

// This placeholder will be replaced by GitHub Actions during deployment
$apiKey = "CLAUDE_API_KEY_PLACEHOLDER";

// Fallback for local development: if placeholder is not replaced, try to read from environment
if ($apiKey === "CLAUDE_API_KEY_PLACEHOLDER") {
    $apiKey = getenv("ANTHROPIC_API_KEY") ?: "";
}

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(["error" => "API Key not configured."]);
    exit;
}

$payload = [
    "model" => "claude-3-5-haiku-20241022",
    "max_tokens" => 500,
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
    http_response_code(500);
    echo json_encode(["error" => "HTTP request failed: " . ($error['message'] ?? 'Unknown error')]);
    exit;
}

// Extract HTTP status code from response headers
$status_code = 500;
if (isset($http_response_header) && count($http_response_header) > 0) {
    preg_match('{HTTP\/\S*\s(\d\d\d)}', $http_response_header[0], $match);
    if (isset($match[1])) {
        $status_code = (int)$match[1];
    }
}

if ($status_code !== 200) {
    http_response_code($status_code);
    echo $response;
    exit;
}

$responseData = json_decode($response, true);
$content = isset($responseData['content'][0]['text']) ? $responseData['content'][0]['text'] : '';

echo json_encode(["analysis" => $content]);
