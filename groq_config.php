<?php
/**
 * Penguin Hacker RPG - Groq API Configuration
 *
 * Loads environment variables from a .env file (if present) so we don't hard-code secrets.
 * Expected variable: GROQU_API_KEY or GROQ_API_KEY (legacy key name supported)
 */

// Simple .env loader (no external dependency required)
function loadEnv($path) {
	if (!file_exists($path)) {
		return;
	}
	$lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
	foreach ($lines as $line) {
		$trimmed = trim($line);
		if ($trimmed === '' || str_starts_with($trimmed, '#')) {
			continue;
		}
		if (strpos($trimmed, '=') !== false) {
			[$name, $value] = explode('=', $trimmed, 2);
			$name = trim($name);
			$value = trim($value);
			if ($name !== '' && getenv($name) === false) {
				putenv("{$name}={$value}");
			}
		}
	}
}

// Load .env from project root (same directory as this config file)
loadEnv(__DIR__ . '/.env');

// Support both GROQ_API_KEY (correct) and GROQU_API_KEY (typo resilience)
$groqApiKey = getenv('GROQ_API_KEY');
if (!$groqApiKey) {
	$groqApiKey = getenv('GROQU_API_KEY');
}

// Warn (server-side) if not set
if (!$groqApiKey) {
	error_log('[Penguin Hacker RPG] Missing GROQ_API_KEY in environment. Set it in .env file.');
}

// Optionally expose to rest of app via constant
if ($groqApiKey && !defined('GROQ_API_KEY')) {
	define('GROQ_API_KEY', $groqApiKey);
}
?>