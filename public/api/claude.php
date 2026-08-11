<?php
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

$ch = curl_init("https://api.anthropic.com/v1/messages");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: " . $apiKey,
    "anthropic-version: 2023-06-01"
]);

// Set timeout
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    http_response_code(500);
    echo json_encode(["error" => "Curl error: " . $error_msg]);
    curl_close($ch);
    exit;
}

curl_close($ch);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo $response;
    exit;
}

$responseData = json_decode($response, true);
$content = isset($responseData['content'][0]['text']) ? $responseData['content'][0]['text'] : '';

echo json_encode(["analysis" => $content]);
