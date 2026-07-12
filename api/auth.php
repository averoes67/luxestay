<?php
/**
 * LuxeStay Hotel - Authentication API
 *
 * Endpoints:
 *   POST action=login     - Authenticate user
 *   POST action=register  - Create new guest account
 *   POST action=logout    - Destroy session
 *   GET  action=check     - Check current auth status
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../includes/auth.php';

// Parse JSON request body (fetch sends JSON, not form-encoded)
$body = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $body = $decoded;
    } else {
        $body = $_POST; // fallback for form-encoded
    }
}

$action = input('action');

switch ($action) {
    // ---------------------------------------------------------
    // LOGIN
    // ---------------------------------------------------------
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $email    = input('email', $body);
        $password = input('password', $body);

        if (!$email || !$password) {
            jsonResponse(['success' => false, 'error' => 'Email and password are required.'], 400);
        }

        if (!isValidEmail($email)) {
            jsonResponse(['success' => false, 'error' => 'Invalid email format.'], 400);
        }

        $user = login($email, $password);

        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'Invalid email or password.'], 401);
        }

        jsonResponse([
            'success' => true,
            'message' => 'Login successful.',
            'user'    => $user,
        ]);
        break;

    // ---------------------------------------------------------
    // REGISTER
    // ---------------------------------------------------------
    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $fullName = input('full_name', $body);
        $email    = input('email', $body);
        $password = input('password', $body);
        $phone    = input('phone', $body, '');

        // Validate required fields
        $missing = validateRequired(['full_name', 'email', 'password'], $body);
        if (!empty($missing)) {
            jsonResponse([
                'success' => false,
                'error'   => 'Missing required fields: ' . implode(', ', $missing),
            ], 400);
        }

        if (!isValidEmail($email)) {
            jsonResponse(['success' => false, 'error' => 'Invalid email format.'], 400);
        }

        if (strlen($password) < 6) {
            jsonResponse(['success' => false, 'error' => 'Password must be at least 6 characters.'], 400);
        }

        if (strlen($fullName) < 2 || strlen($fullName) > 100) {
            jsonResponse(['success' => false, 'error' => 'Full name must be between 2 and 100 characters.'], 400);
        }

        try {
            $user = register($fullName, $email, $password, $phone);
            jsonResponse([
                'success' => true,
                'message' => 'Registration successful.',
                'user'    => $user,
            ], 201);
        } catch (RuntimeException $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 409);
        }
        break;

    // ---------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------
    case 'logout':
        logout();
        jsonResponse([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
        break;

    // ---------------------------------------------------------
    // CHECK AUTH STATUS
    // ---------------------------------------------------------
    case 'check':
        $user = getCurrentUser();
        if ($user) {
            jsonResponse([
                'success'       => true,
                'loggedIn'      => true,
                'authenticated' => true,
                'user'          => $user,
            ]);
        } else {
            jsonResponse([
                'success'       => true,
                'loggedIn'      => false,
                'authenticated' => false,
                'user'          => null,
            ]);
        }
        break;

    // ---------------------------------------------------------
    // UNKNOWN ACTION
    // ---------------------------------------------------------
    default:
        jsonResponse(['success' => false, 'error' => 'Invalid action. Supported: login, register, logout, check.'], 400);
        break;
}
