<?php
/**
 * LuxeStay Hotel - Room Functions
 */

require_once __DIR__ . '/config.php';

/**
 * Get all active room types, with optional filters.
 *
 * @param  array $filters  Optional keys: min_price, max_price, capacity
 * @return array
 */
function getRoomTypes(array $filters = []): array
{
    $db = getDB();

    $sql = 'SELECT id, name, slug, description, base_price, capacity, size_sqm, amenities, image_url, is_active FROM room_types WHERE is_active = 1';
    $params = [];

    if (!empty($filters['min_price'])) {
        $sql .= ' AND base_price >= :min_price';
        $params[':min_price'] = (float) $filters['min_price'];
    }

    if (!empty($filters['max_price'])) {
        $sql .= ' AND base_price <= :max_price';
        $params[':max_price'] = (float) $filters['max_price'];
    }

    if (!empty($filters['capacity'])) {
        $sql .= ' AND capacity >= :capacity';
        $params[':capacity'] = (int) $filters['capacity'];
    }

    $sql .= ' ORDER BY base_price ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $types = $stmt->fetchAll();

    // Decode amenities JSON for each type
    foreach ($types as &$type) {
        $type['amenities']  = json_decode($type['amenities'], true);
        $type['base_price'] = (float) $type['base_price'];
        $type['capacity']   = (int) $type['capacity'];
        $type['size_sqm']   = (int) $type['size_sqm'];
        $type['is_active']  = (bool) $type['is_active'];
    }
    unset($type);

    return $types;
}

/**
 * Get a single room type by its slug.
 *
 * @param  string     $slug
 * @return array|null
 */
function getRoomTypeBySlug(string $slug): ?array
{
    $db = getDB();

    $stmt = $db->prepare('SELECT id, name, slug, description, base_price, capacity, size_sqm, amenities, image_url, is_active FROM room_types WHERE slug = :slug LIMIT 1');
    $stmt->execute([':slug' => $slug]);
    $type = $stmt->fetch();

    if (!$type) {
        return null;
    }

    $type['amenities']  = json_decode($type['amenities'], true);
    $type['base_price'] = (float) $type['base_price'];
    $type['capacity']   = (int) $type['capacity'];
    $type['size_sqm']   = (int) $type['size_sqm'];
    $type['is_active']  = (bool) $type['is_active'];

    return $type;
}

/**
 * Get a single room type by its ID.
 *
 * @param  int        $id
 * @return array|null
 */
function getRoomTypeById(int $id): ?array
{
    $db = getDB();

    $stmt = $db->prepare('SELECT id, name, slug, description, base_price, capacity, size_sqm, amenities, image_url, is_active FROM room_types WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $type = $stmt->fetch();

    if (!$type) {
        return null;
    }

    $type['amenities']  = json_decode($type['amenities'], true);
    $type['base_price'] = (float) $type['base_price'];
    $type['capacity']   = (int) $type['capacity'];
    $type['size_sqm']   = (int) $type['size_sqm'];
    $type['is_active']  = (bool) $type['is_active'];

    return $type;
}

/**
 * Get available rooms of a specific type for a date range.
 *
 * A room is available if it has no non-cancelled reservations
 * overlapping the requested date range and its status is not 'maintenance'.
 *
 * @param  int    $typeId
 * @param  string $checkIn  Y-m-d
 * @param  string $checkOut Y-m-d
 * @return array
 */
function getAvailableRooms(int $typeId, string $checkIn, string $checkOut): array
{
    $db = getDB();

    $sql = "
        SELECT r.id, r.room_number, r.floor, r.status
        FROM rooms r
        WHERE r.room_type_id = :type_id
          AND r.status != 'maintenance'
          AND r.id NOT IN (
              SELECT res.room_id
              FROM reservations res
              WHERE res.status NOT IN ('cancelled', 'checked_out')
                AND res.check_in < :check_out
                AND res.check_out > :check_in
          )
        ORDER BY r.room_number ASC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':type_id'   => $typeId,
        ':check_in'  => $checkIn,
        ':check_out' => $checkOut,
    ]);

    return $stmt->fetchAll();
}

/**
 * Count available rooms of a specific type for a date range.
 *
 * @param  int    $typeId
 * @param  string $checkIn  Y-m-d
 * @param  string $checkOut Y-m-d
 * @return int
 */
function countAvailableRooms(int $typeId, string $checkIn, string $checkOut): int
{
    return count(getAvailableRooms($typeId, $checkIn, $checkOut));
}

/**
 * Get all rooms with their type info and status (for admin).
 *
 * @return array
 */
function getAllRooms(): array
{
    $db = getDB();

    $sql = "
        SELECT r.id, r.room_number, r.floor, r.status,
               rt.id AS type_id, rt.name AS type_name, rt.slug AS type_slug,
               rt.base_price, rt.capacity
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        ORDER BY r.room_number ASC
    ";

    $stmt = $db->query($sql);
    $rooms = $stmt->fetchAll();

    foreach ($rooms as &$room) {
        $room['base_price'] = (float) $room['base_price'];
        $room['capacity']   = (int) $room['capacity'];
    }
    unset($room);

    return $rooms;
}
