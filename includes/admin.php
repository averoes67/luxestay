<?php
/**
 * LuxeStay Hotel - Admin Functions
 */

require_once __DIR__ . '/config.php';

/**
 * Get comprehensive dashboard statistics.
 *
 * @return array
 */
function getDashboardStats(): array
{
    $db = getDB();

    // Total rooms
    $totalRooms = (int) $db->query("SELECT COUNT(*) FROM rooms")->fetchColumn();

    // Occupied rooms (rooms with active checked_in reservations)
    $occupiedRooms = (int) $db->query("
        SELECT COUNT(DISTINCT r.id)
        FROM rooms r
        JOIN reservations res ON r.id = res.room_id
        WHERE res.status = 'checked_in'
          AND res.check_in <= CURDATE()
          AND res.check_out > CURDATE()
    ")->fetchColumn();

    // Occupancy rate
    $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

    // Today's revenue (reservations with check_in today)
    $todayRevenue = (float) $db->query("
        SELECT COALESCE(SUM(total_price), 0)
        FROM reservations
        WHERE status NOT IN ('cancelled')
          AND check_in = CURDATE()
    ")->fetchColumn();

    // This month's revenue
    $monthRevenue = (float) $db->query("
        SELECT COALESCE(SUM(total_price), 0)
        FROM reservations
        WHERE status NOT IN ('cancelled')
          AND YEAR(check_in) = YEAR(CURDATE())
          AND MONTH(check_in) = MONTH(CURDATE())
    ")->fetchColumn();

    // Total guests (unique users with role 'guest')
    $totalGuests = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'guest'")->fetchColumn();

    // Active reservations (confirmed + checked_in)
    $activeReservations = (int) $db->query("
        SELECT COUNT(*)
        FROM reservations
        WHERE status IN ('confirmed', 'checked_in')
    ")->fetchColumn();

    // Pending reservations
    $pendingReservations = (int) $db->query("
        SELECT COUNT(*)
        FROM reservations
        WHERE status = 'pending'
    ")->fetchColumn();

    return [
        'total_rooms'          => $totalRooms,
        'occupied_rooms'       => $occupiedRooms,
        'occupancy_rate'       => $occupancyRate,
        'today_revenue'        => $todayRevenue,
        'month_revenue'        => $monthRevenue,
        'total_guests'         => $totalGuests,
        'active_reservations'  => $activeReservations,
        'pending_reservations' => $pendingReservations,
    ];
}

/**
 * Get daily revenue for the last N days (for line/bar chart).
 *
 * @param  int   $days Number of days to look back.
 * @return array       [['date' => 'Y-m-d', 'revenue' => float], ...]
 */
function getDailyRevenue(int $days = 30): array
{
    $db = getDB();

    $stmt = $db->prepare("
        SELECT
            DATE(check_in) AS date,
            COALESCE(SUM(total_price), 0) AS revenue
        FROM reservations
        WHERE status NOT IN ('cancelled')
          AND check_in >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
          AND check_in <= CURDATE()
        GROUP BY DATE(check_in)
        ORDER BY date ASC
    ");
    $stmt->execute([':days' => $days]);
    $results = $stmt->fetchAll();

    // Fill in missing dates with zero revenue
    $startDate = new DateTime("-{$days} days");
    $endDate   = new DateTime('today');
    $revenueMap = [];
    foreach ($results as $row) {
        $revenueMap[$row['date']] = (float) $row['revenue'];
    }

    $output = [];
    $current = clone $startDate;
    while ($current <= $endDate) {
        $dateStr = $current->format('Y-m-d');
        $output[] = [
            'date'    => $dateStr,
            'revenue' => $revenueMap[$dateStr] ?? 0.0,
        ];
        $current->modify('+1 day');
    }

    return $output;
}

/**
 * Get total revenue grouped by room type (for pie/donut chart).
 *
 * @return array [['room_type' => string, 'revenue' => float], ...]
 */
function getRevenueByRoomType(): array
{
    $db = getDB();

    $results = $db->query("
        SELECT
            rt.name AS room_type,
            COALESCE(SUM(res.total_price), 0) AS revenue
        FROM reservations res
        JOIN rooms r ON res.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE res.status NOT IN ('cancelled')
        GROUP BY rt.id, rt.name
        ORDER BY revenue DESC
    ")->fetchAll();

    foreach ($results as &$row) {
        $row['revenue'] = (float) $row['revenue'];
    }
    unset($row);

    return $results;
}

/**
 * Get the most recent reservations with user and room details.
 *
 * @param  int   $limit
 * @return array
 */
function getRecentReservations(int $limit = 10): array
{
    $db = getDB();

    $stmt = $db->prepare("
        SELECT
            res.id, res.check_in, res.check_out, res.total_price,
            res.guests_count, res.status, res.created_at,
            r.room_number,
            rt.name AS room_type_name,
            u.full_name AS guest_name, u.email AS guest_email
        FROM reservations res
        JOIN rooms r ON res.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        JOIN users u ON res.user_id = u.id
        ORDER BY res.created_at DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $reservations = $stmt->fetchAll();

    foreach ($reservations as &$res) {
        $res['total_price'] = (float) $res['total_price'];
        $res['guests_count'] = (int) $res['guests_count'];
    }
    unset($res);

    return $reservations;
}

/**
 * Get paginated guest list with booking count and total spent.
 *
 * @param  string $search   Search by name or email.
 * @param  int    $page
 * @param  int    $perPage
 * @return array            ['data' => [...], 'total' => int, 'page' => int, 'per_page' => int, 'total_pages' => int]
 */
function getGuestList(string $search = '', int $page = 1, int $perPage = 10): array
{
    $db = getDB();

    $page    = max(1, $page);
    $perPage = max(1, min(100, $perPage));
    $offset  = ($page - 1) * $perPage;

    $where  = "WHERE u.role = 'guest'";
    $params = [];

    if ($search !== '') {
        $where .= ' AND (u.full_name LIKE :search OR u.email LIKE :search2)';
        $params[':search']  = '%' . $search . '%';
        $params[':search2'] = '%' . $search . '%';
    }

    // Count total
    $countStmt = $db->prepare("SELECT COUNT(*) FROM users u {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    // Fetch page with aggregates
    $sql = "
        SELECT
            u.id, u.full_name, u.email, u.phone, u.created_at,
            COUNT(res.id) AS booking_count,
            COALESCE(SUM(CASE WHEN res.status != 'cancelled' THEN res.total_price ELSE 0 END), 0) AS total_spent
        FROM users u
        LEFT JOIN reservations res ON u.id = res.user_id
        {$where}
        GROUP BY u.id, u.full_name, u.email, u.phone, u.created_at
        ORDER BY u.created_at DESC
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

    foreach ($data as &$guest) {
        $guest['booking_count'] = (int) $guest['booking_count'];
        $guest['total_spent']   = (float) $guest['total_spent'];
    }
    unset($guest);

    return [
        'data'        => $data,
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => (int) ceil($total / $perPage),
    ];
}

/**
 * Update the base price of a room type.
 *
 * @param  int   $id    Room type ID.
 * @param  float $price New base price.
 * @return bool
 */
function updateRoomTypePrice(int $id, float $price): bool
{
    if ($price < 0) {
        throw new RuntimeException('Price must be a positive value.');
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE room_types SET base_price = :price WHERE id = :id');
    $stmt->execute([':price' => $price, ':id' => $id]);

    return $stmt->rowCount() > 0;
}

/**
 * Update a room's status.
 *
 * @param  int    $roomId
 * @param  string $status  One of: available, occupied, maintenance
 * @return bool
 */
function updateRoomStatus(int $roomId, string $status): bool
{
    $validStatuses = ['available', 'occupied', 'maintenance'];
    if (!in_array($status, $validStatuses, true)) {
        throw new RuntimeException('Invalid room status: ' . $status);
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE rooms SET status = :status WHERE id = :id');
    $stmt->execute([':status' => $status, ':id' => $roomId]);

    return $stmt->rowCount() > 0;
}
