<?php
/**
 * LuxeStay Hotel - Reservation Functions
 */

require_once __DIR__ . '/config.php';

/**
 * Create a new reservation.
 *
 * @param  int    $userId
 * @param  int    $roomId
 * @param  string $checkIn         Y-m-d
 * @param  string $checkOut        Y-m-d
 * @param  int    $guestsCount
 * @param  string|null $specialRequests
 * @param  float  $totalPrice
 * @return array  The created reservation.
 */
function createReservation(
    int $userId,
    int $roomId,
    string $checkIn,
    string $checkOut,
    int $guestsCount,
    ?string $specialRequests,
    float $totalPrice
): array {
    $db = getDB();

    $stmt = $db->prepare("
        INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status)
        VALUES (:user_id, :room_id, :check_in, :check_out, :total_price, :guests_count, :special_requests, 'pending')
    ");

    $stmt->execute([
        ':user_id'          => $userId,
        ':room_id'          => $roomId,
        ':check_in'         => $checkIn,
        ':check_out'        => $checkOut,
        ':total_price'      => $totalPrice,
        ':guests_count'     => $guestsCount,
        ':special_requests' => $specialRequests,
    ]);

    $reservationId = (int) $db->lastInsertId();
    return getReservationById($reservationId);
}

/**
 * Get all reservations for a specific user, with room and room type details.
 *
 * @param  int   $userId
 * @return array
 */
function getUserReservations(int $userId): array
{
    $db = getDB();

    $stmt = $db->prepare("
        SELECT
            res.id, res.check_in, res.check_out, res.total_price,
            res.guests_count, res.special_requests, res.status, res.created_at,
            r.room_number, r.floor,
            rt.name AS room_type_name, rt.slug AS room_type_slug,
            rt.base_price, rt.image_url
        FROM reservations res
        JOIN rooms r ON res.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE res.user_id = :user_id
        ORDER BY res.check_in DESC
    ");
    $stmt->execute([':user_id' => $userId]);
    $reservations = $stmt->fetchAll();

    foreach ($reservations as &$res) {
        $res['total_price'] = (float) $res['total_price'];
        $res['base_price']  = (float) $res['base_price'];
        $res['guests_count'] = (int) $res['guests_count'];
    }
    unset($res);

    return $reservations;
}

/**
 * Get a single reservation by ID with full details.
 *
 * @param  int        $id
 * @return array|null
 */
function getReservationById(int $id): ?array
{
    $db = getDB();

    $stmt = $db->prepare("
        SELECT
            res.id, res.user_id, res.room_id,
            res.check_in, res.check_out, res.total_price,
            res.guests_count, res.special_requests, res.status, res.created_at,
            r.room_number, r.floor,
            rt.id AS room_type_id, rt.name AS room_type_name, rt.slug AS room_type_slug,
            rt.base_price, rt.image_url,
            u.full_name AS guest_name, u.email AS guest_email, u.phone AS guest_phone
        FROM reservations res
        JOIN rooms r ON res.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        JOIN users u ON res.user_id = u.id
        WHERE res.id = :id
        LIMIT 1
    ");
    $stmt->execute([':id' => $id]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
        return null;
    }

    $reservation['total_price'] = (float) $reservation['total_price'];
    $reservation['base_price']  = (float) $reservation['base_price'];
    $reservation['guests_count'] = (int) $reservation['guests_count'];
    $reservation['user_id'] = (int) $reservation['user_id'];
    $reservation['room_id'] = (int) $reservation['room_id'];

    return $reservation;
}

/**
 * Cancel a reservation. Verifies ownership before cancelling.
 *
 * @param  int  $id      Reservation ID.
 * @param  int  $userId  The user requesting cancellation.
 * @return bool True on success, false if not found or not owned.
 * @throws RuntimeException If the reservation cannot be cancelled.
 */
function cancelReservation(int $id, int $userId): bool
{
    $db = getDB();

    // Fetch and verify ownership
    $stmt = $db->prepare('SELECT id, user_id, status FROM reservations WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $reservation = $stmt->fetch();

    if (!$reservation) {
        return false;
    }

    if ((int) $reservation['user_id'] !== $userId) {
        return false;
    }

    // Only pending/confirmed reservations can be cancelled
    if (!in_array($reservation['status'], ['pending', 'confirmed'], true)) {
        throw new RuntimeException('Only pending or confirmed reservations can be cancelled.');
    }

    $update = $db->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = :id");
    $update->execute([':id' => $id]);

    return true;
}

/**
 * Get all reservations with user and room info (admin).
 *
 * @param  array $filters  Optional: status, page, per_page
 * @return array           ['data' => [...], 'total' => int, 'page' => int, 'per_page' => int, 'total_pages' => int]
 */
function getAllReservations(array $filters = []): array
{
    $db = getDB();

    $page    = max(1, (int) ($filters['page'] ?? 1));
    $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 15)));
    $offset  = ($page - 1) * $perPage;

    $where  = '';
    $params = [];

    if (!empty($filters['status'])) {
        $where = ' WHERE res.status = :status';
        $params[':status'] = $filters['status'];
    }

    // Count total
    $countSql = "SELECT COUNT(*) FROM reservations res" . $where;
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    // Fetch page
    $sql = "
        SELECT
            res.id, res.check_in, res.check_out, res.total_price,
            res.guests_count, res.special_requests, res.status, res.created_at,
            r.room_number, r.floor,
            rt.name AS room_type_name, rt.slug AS room_type_slug,
            u.id AS user_id, u.full_name AS guest_name, u.email AS guest_email
        FROM reservations res
        JOIN rooms r ON res.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        JOIN users u ON res.user_id = u.id
        {$where}
        ORDER BY res.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $db->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $data = $stmt->fetchAll();

    foreach ($data as &$row) {
        $row['total_price'] = (float) $row['total_price'];
        $row['guests_count'] = (int) $row['guests_count'];
        $row['user_id'] = (int) $row['user_id'];
    }
    unset($row);

    return [
        'data'        => $data,
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => (int) ceil($total / $perPage),
    ];
}

/**
 * Update a reservation's status (admin action).
 *
 * @param  int    $id
 * @param  string $status  One of: pending, confirmed, checked_in, checked_out, cancelled
 * @return bool
 */
function updateReservationStatus(int $id, string $status): bool
{
    $validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!in_array($status, $validStatuses, true)) {
        throw new RuntimeException('Invalid reservation status: ' . $status);
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE reservations SET status = :status WHERE id = :id');
    $stmt->execute([':status' => $status, ':id' => $id]);

    return $stmt->rowCount() > 0;
}
