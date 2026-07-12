<?php
/**
 * LuxeStay Hotel - Application Configuration
 * 
 * Central configuration: database connection, session management,
 * global constants, and utility helpers.
 */

// Start session only if one is not already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------
define('SITE_NAME', 'LuxeStay');
define('BASE_URL', '/hotel');
define('DB_HOST', 'localhost');
define('DB_NAME', 'hotel_luxestay');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// -----------------------------------------------------------
// PDO Database Connection (singleton)
// -----------------------------------------------------------
function getDB(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // In production, log the error instead of exposing details
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed. Please try again later.'
            ]);
            exit;
        }
    }

    return $pdo;
}

// -----------------------------------------------------------
// JSON Response Helper
// -----------------------------------------------------------
/**
 * Send a JSON response and terminate execution.
 *
 * @param array $data       The response payload.
 * @param int   $statusCode HTTP status code (default 200).
 */
function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// -----------------------------------------------------------
// Input Helpers
// -----------------------------------------------------------
/**
 * Retrieve and trim a value from the given source array.
 */
function input(string $key, array $source = null, $default = null)
{
    if ($source === null) {
        $source = $_REQUEST;
    }
    $value = $source[$key] ?? $default;
    return is_string($value) ? trim($value) : $value;
}

/**
 * Validate that all required keys exist and are non-empty in the source.
 * Returns an array of missing field names, or empty array if all present.
 */
function validateRequired(array $keys, array $source): array
{
    $missing = [];
    foreach ($keys as $key) {
        $val = $source[$key] ?? null;
        if ($val === null || (is_string($val) && trim($val) === '')) {
            $missing[] = $key;
        }
    }
    return $missing;
}

/**
 * Validate an email address format.
 */
function isValidEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate a date string (Y-m-d format).
 */
function isValidDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}
