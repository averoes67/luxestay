<?php
/**
 * LuxeStay Hotel - Admin API
 *
 * All endpoints require admin authentication.
 *
 * GET endpoints:
 *   action=dashboard          - Dashboard statistics
 *   action=revenue            - Daily revenue (accept days param)
 *   action=revenue_by_type    - Revenue by room type
 *   action=recent             - Recent reservations
 *   action=guests             - Guest list (accept search, page params)
 *   action=rooms              - All rooms with details
 *
 * POST endpoints:
 *   action=update_price          - Update room type base price
 *   action=update_room_status    - Update room status
 *   action=update_reservation    - Update reservation status
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rooms.php';
require_once __DIR__ . '/../includes/reservations.php';
require_once __DIR__ . '/../includes/admin.php';

// Parse JSON request body
$body = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $body = $decoded;
    } else {
        $body = $_POST;
    }
}

// All admin endpoints require admin authentication
$admin = requireAuth('admin');
if (!$admin) {
    jsonResponse(['success' => false, 'error' => 'Admin access required.'], 403);
}

$action = input('action');

switch ($action) {
    // ---------------------------------------------------------
    // DASHBOARD STATS
    // ---------------------------------------------------------
    case 'dashboard':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $stats = getDashboardStats();

        jsonResponse([
            'success' => true,
            'data'    => $stats,
        ]);
        break;

    // ---------------------------------------------------------
    // DAILY REVENUE
    // ---------------------------------------------------------
    case 'revenue':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $days = (int) input('days', $_GET, 30);
        $days = max(1, min(365, $days));

        $revenue = getDailyRevenue($days);

        jsonResponse([
            'success' => true,
            'data'    => $revenue,
            'days'    => $days,
        ]);
        break;

    // ---------------------------------------------------------
    // REVENUE BY ROOM TYPE
    // ---------------------------------------------------------
    case 'revenue_by_type':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $data = getRevenueByRoomType();

        jsonResponse([
            'success' => true,
            'data'    => $data,
        ]);
        break;

    // ---------------------------------------------------------
    // RECENT RESERVATIONS
    // ---------------------------------------------------------
    case 'recent':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $limit = (int) input('limit', $_GET, 10);
        $limit = max(1, min(50, $limit));

        $reservations = getRecentReservations($limit);

        jsonResponse([
            'success' => true,
            'data'    => $reservations,
            'count'   => count($reservations),
        ]);
        break;

    // ---------------------------------------------------------
    // GUEST LIST
    // ---------------------------------------------------------
    case 'guests':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $search  = input('search', $_GET, '');
        $page    = (int) input('page', $_GET, 1);
        $perPage = (int) input('per_page', $_GET, 10);

        $result = getGuestList($search, $page, $perPage);

        jsonResponse([
            'success' => true,
            'data'    => $result['data'],
            'meta'    => [
                'total'       => $result['total'],
                'page'        => $result['page'],
                'per_page'    => $result['per_page'],
                'total_pages' => $result['total_pages'],
            ],
        ]);
        break;

    // ---------------------------------------------------------
    // ALL ROOMS
    // ---------------------------------------------------------
    case 'rooms':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $rooms = getAllRooms();

        jsonResponse([
            'success' => true,
            'data'    => $rooms,
            'count'   => count($rooms),
        ]);
        break;

    // ---------------------------------------------------------
    // UPDATE ROOM TYPE PRICE
    // ---------------------------------------------------------
    case 'update_price':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $roomTypeId = input('room_type_id', $body);
        $price      = input('price', $body);

        if (!$roomTypeId || !is_numeric($roomTypeId)) {
            jsonResponse(['success' => false, 'error' => 'Valid room_type_id is required.'], 400);
        }

        if ($price === null || $price === '' || !is_numeric($price)) {
            jsonResponse(['success' => false, 'error' => 'Valid price is required.'], 400);
        }

        try {
            $result = updateRoomTypePrice((int) $roomTypeId, (float) $price);
            if (!$result) {
                jsonResponse(['success' => false, 'error' => 'Room type not found or price unchanged.'], 404);
            }

            $updatedType = getRoomTypeById((int) $roomTypeId);

            jsonResponse([
                'success'   => true,
                'message'   => 'Room type price updated.',
                'room_type' => $updatedType,
            ]);
        } catch (RuntimeException $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
        }
        break;

    // ---------------------------------------------------------
    // UPDATE ROOM STATUS
    // ---------------------------------------------------------
    case 'update_room_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $roomId = input('room_id', $body);
        $status = input('status', $body);

        if (!$roomId || !is_numeric($roomId)) {
            jsonResponse(['success' => false, 'error' => 'Valid room_id is required.'], 400);
        }

        if (!$status) {
            jsonResponse(['success' => false, 'error' => 'Status is required.'], 400);
        }

        try {
            $result = updateRoomStatus((int) $roomId, $status);
            if (!$result) {
                jsonResponse(['success' => false, 'error' => 'Room not found or status unchanged.'], 404);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Room status updated.',
            ]);
        } catch (RuntimeException $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
        }
        break;

    // ---------------------------------------------------------
    // UPDATE RESERVATION STATUS
    // ---------------------------------------------------------
    case 'update_reservation':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $reservationId = input('reservation_id', $body);
        $status        = input('status', $body);

        if (!$reservationId || !is_numeric($reservationId)) {
            jsonResponse(['success' => false, 'error' => 'Valid reservation_id is required.'], 400);
        }

        if (!$status) {
            jsonResponse(['success' => false, 'error' => 'Status is required.'], 400);
        }

        try {
            $result = updateReservationStatus((int) $reservationId, $status);
            if (!$result) {
                jsonResponse(['success' => false, 'error' => 'Reservation not found.'], 404);
            }

            $updated = getReservationById((int) $reservationId);

            jsonResponse([
                'success'     => true,
                'message'     => 'Reservation status updated.',
                'reservation' => $updated,
            ]);
        } catch (RuntimeException $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
        }
        break;

    // ---------------------------------------------------------
    // UNKNOWN ACTION
    // ---------------------------------------------------------
    default:
        jsonResponse([
            'success' => false,
            'error'   => 'Invalid action. Supported: dashboard, revenue, revenue_by_type, recent, guests, rooms, update_price, update_room_status, update_reservation.',
        ], 400);
        break;
}
