<?php
/**
 * LuxeStay Hotel - Authentication Functions
 */

require_once __DIR__ . '/config.php';

/**
 * Attempt to log in a user with email and password.
 *
 * @param  string     $email
 * @param  string     $password
 * @return array|false User data on success, false on failure.
 */
function login(string $email, string $password)
{
    $db = getDB();

    $stmt = $db->prepare('SELECT id, full_name, email, password_hash, phone, role, created_at FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        return false;
    }

    // Store user in session (exclude password hash)
    $_SESSION['user'] = [
        'id'        => (int) $user['id'],
        'full_name' => $user['full_name'],
        'email'     => $user['email'],
        'phone'     => $user['phone'],
        'role'      => $user['role'],
    ];

    return $_SESSION['user'];
}

/**
 * Register a new guest account.
 *
 * @param  string $fullName
 * @param  string $email
 * @param  string $password  Plain-text password (will be hashed).
 * @param  string $phone
 * @return array             Created user data.
 * @throws RuntimeException  If email already exists.
 */
function register(string $fullName, string $email, string $password, string $phone): array
{
    $db = getDB();

    // Check for duplicate email
    $check = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $check->execute([':email' => $email]);
    if ($check->fetch()) {
        throw new RuntimeException('An account with this email address already exists.');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (:full_name, :email, :password_hash, :phone, :role)'
    );
    $stmt->execute([
        ':full_name'     => $fullName,
        ':email'         => $email,
        ':password_hash' => $hash,
        ':phone'         => $phone,
        ':role'          => 'guest',
    ]);

    $userId = (int) $db->lastInsertId();

    $userData = [
        'id'        => $userId,
        'full_name' => $fullName,
        'email'     => $email,
        'phone'     => $phone,
        'role'      => 'guest',
    ];

    // Auto-login after registration
    $_SESSION['user'] = $userData;

    return $userData;
}

/**
 * Log the current user out by destroying the session.
 */
function logout(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
}

/**
 * Require that the current request is authenticated.
 * Optionally require a specific role.
 *
 * @param  string|null $role  If provided, the user must have this role.
 * @return array|false        User data if authorized, false otherwise.
 */
function requireAuth(?string $role = null)
{
    $user = getCurrentUser();

    if (!$user) {
        return false;
    }

    if ($role !== null && $user['role'] !== $role) {
        return false;
    }

    return $user;
}

/**
 * Get the currently logged-in user from the session.
 *
 * @return array|null User data or null if not logged in.
 */
function getCurrentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

/**
 * Check if a user is currently logged in.
 */
function isLoggedIn(): bool
{
    return isset($_SESSION['user']);
}

/**
 * Check if the current user is an admin.
 */
function isAdmin(): bool
{
    return isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'admin';
}
