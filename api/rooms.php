<?php
/**
 * LuxeStay Hotel - Rooms API
 *
 * Endpoints (all GET):
 *   action=list                                         - List room types (with optional filters)
 *   action=detail&slug=X                                - Single room type details
 *   action=availability&type_id=X&check_in=Y&check_out=Z - Available room count
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../includes/rooms.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed. Use GET.'], 405);
}

$action = input('action', $_GET);

switch ($action) {
    // ---------------------------------------------------------
    // LIST ALL ROOM TYPES
    // ---------------------------------------------------------
    case 'list':
        $filters = [];

        if (isset($_GET['min_price']) && is_numeric($_GET['min_price'])) {
            $filters['min_price'] = $_GET['min_price'];
        }
        if (isset($_GET['max_price']) && is_numeric($_GET['max_price'])) {
            $filters['max_price'] = $_GET['max_price'];
        }
        if (isset($_GET['capacity']) && is_numeric($_GET['capacity'])) {
            $filters['capacity'] = $_GET['capacity'];
        }

        $roomTypes = getRoomTypes($filters);

        jsonResponse([
            'success' => true,
            'data'    => $roomTypes,
            'count'   => count($roomTypes),
        ]);
        break;

    // ---------------------------------------------------------
    // SINGLE ROOM TYPE DETAIL
    // ---------------------------------------------------------
    case 'detail':
        $slug = input('slug', $_GET);

        if (!$slug) {
            jsonResponse(['success' => false, 'error' => 'Slug parameter is required.'], 400);
        }

        $roomType = getRoomTypeBySlug($slug);

        if (!$roomType) {
            jsonResponse(['success' => false, 'error' => 'Room type not found.'], 404);
        }

        jsonResponse([
            'success' => true,
            'data'    => $roomType,
        ]);
        break;

    // ---------------------------------------------------------
    // CHECK AVAILABILITY
    // ---------------------------------------------------------
    case 'availability':
        $typeId   = input('type_id', $_GET);
        $checkIn  = input('check_in', $_GET);
        $checkOut = input('check_out', $_GET);

        if (!$typeId || !$checkIn || !$checkOut) {
            jsonResponse(['success' => false, 'error' => 'Parameters required: type_id, check_in, check_out.'], 400);
        }

        if (!is_numeric($typeId)) {
            jsonResponse(['success' => false, 'error' => 'type_id must be a number.'], 400);
        }

        if (!isValidDate($checkIn) || !isValidDate($checkOut)) {
            jsonResponse(['success' => false, 'error' => 'Dates must be in Y-m-d format.'], 400);
        }

        if ($checkIn >= $checkOut) {
            jsonResponse(['success' => false, 'error' => 'Check-out date must be after check-in date.'], 400);
        }

        if ($checkIn < date('Y-m-d')) {
            jsonResponse(['success' => false, 'error' => 'Check-in date cannot be in the past.'], 400);
        }

        $roomType = getRoomTypeById((int) $typeId);
        if (!$roomType) {
            jsonResponse(['success' => false, 'error' => 'Room type not found.'], 404);
        }

        $availableCount = countAvailableRooms((int) $typeId, $checkIn, $checkOut);
        $nights = (int) ((strtotime($checkOut) - strtotime($checkIn)) / 86400);

        jsonResponse([
            'success'         => true,
            'available_count' => $availableCount,
            'room_type'       => $roomType['name'],
            'price_per_night' => $roomType['base_price'],
            'nights'          => $nights,
            'total_price'     => $roomType['base_price'] * $nights,
        ]);
        break;

    // ---------------------------------------------------------
    // UNKNOWN ACTION
    // ---------------------------------------------------------
    default:
        jsonResponse(['success' => false, 'error' => 'Invalid action. Supported: list, detail, availability.'], 400);
        break;
}
