<?php
/**
 * LuxeStay Hotel - Reservations API
 *
 * Endpoints:
 *   POST action=create         - Create a new reservation (auth required)
 *   GET  action=user           - Get current user's reservations (auth required)
 *   POST action=cancel         - Cancel a reservation (auth required, ownership verified)
 *   GET  action=all            - All reservations with filters (admin only)
 *   POST action=update_status  - Update reservation status (admin only)
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rooms.php';
require_once __DIR__ . '/../includes/reservations.php';

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

$action = input('action');

switch ($action) {
    // ---------------------------------------------------------
    // CREATE RESERVATION
    // ---------------------------------------------------------
    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $user = requireAuth();
        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $roomTypeId     = input('room_type_id', $body);
        $checkIn        = input('check_in', $body);
        $checkOut       = input('check_out', $body);
        $guestsCount    = input('guests_count', $body);
        $specialRequests = input('special_requests', $body, null);

        // Validate required fields
        if (!$roomTypeId || !$checkIn || !$checkOut || !$guestsCount) {
            jsonResponse(['success' => false, 'error' => 'Required fields: room_type_id, check_in, check_out, guests_count.'], 400);
        }

        if (!is_numeric($roomTypeId) || !is_numeric($guestsCount)) {
            jsonResponse(['success' => false, 'error' => 'room_type_id and guests_count must be numbers.'], 400);
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

        $guestsCount = (int) $guestsCount;
        $roomTypeId  = (int) $roomTypeId;

        if ($guestsCount < 1) {
            jsonResponse(['success' => false, 'error' => 'Guests count must be at least 1.'], 400);
        }

        // Verify room type exists
        $roomType = getRoomTypeById($roomTypeId);
        if (!$roomType) {
            jsonResponse(['success' => false, 'error' => 'Room type not found.'], 404);
        }

        // Check capacity
        if ($guestsCount > $roomType['capacity']) {
            jsonResponse([
                'success' => false,
                'error'   => sprintf('This room type has a maximum capacity of %d guests.', $roomType['capacity']),
            ], 400);
        }

        // Find an available room
        $availableRooms = getAvailableRooms($roomTypeId, $checkIn, $checkOut);
        if (empty($availableRooms)) {
            jsonResponse(['success' => false, 'error' => 'No rooms available for the selected dates.'], 409);
        }

        // Pick the first available room
        $selectedRoom = $availableRooms[0];

        // Calculate total price
        $nights     = (int) ((strtotime($checkOut) - strtotime($checkIn)) / 86400);
        $totalPrice = $roomType['base_price'] * $nights;

        // Create the reservation
        $reservation = createReservation(
            $user['id'],
            (int) $selectedRoom['id'],
            $checkIn,
            $checkOut,
            $guestsCount,
            $specialRequests,
            $totalPrice
        );

        jsonResponse([
            'success'     => true,
            'message'     => 'Reservation created successfully.',
            'reservation' => $reservation,
        ], 201);
        break;

    // ---------------------------------------------------------
    // GET CURRENT USER'S RESERVATIONS
    // ---------------------------------------------------------
    case 'user':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $user = requireAuth();
        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $reservations = getUserReservations($user['id']);

        jsonResponse([
            'success' => true,
            'data'    => $reservations,
            'count'   => count($reservations),
        ]);
        break;

    // ---------------------------------------------------------
    // CANCEL RESERVATION
    // ---------------------------------------------------------
    case 'cancel':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $user = requireAuth();
        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'Authentication required.'], 401);
        }

        $reservationId = input('reservation_id', $body);
        if (!$reservationId || !is_numeric($reservationId)) {
            jsonResponse(['success' => false, 'error' => 'Valid reservation_id is required.'], 400);
        }

        try {
            $result = cancelReservation((int) $reservationId, $user['id']);
            if (!$result) {
                jsonResponse(['success' => false, 'error' => 'Reservation not found or you do not have permission to cancel it.'], 404);
            }

            jsonResponse([
                'success' => true,
                'message' => 'Reservation cancelled successfully.',
            ]);
        } catch (RuntimeException $e) {
            jsonResponse(['success' => false, 'error' => $e->getMessage()], 400);
        }
        break;

    // ---------------------------------------------------------
    // ALL RESERVATIONS (Admin only)
    // ---------------------------------------------------------
    case 'all':
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $admin = requireAuth('admin');
        if (!$admin) {
            jsonResponse(['success' => false, 'error' => 'Admin access required.'], 403);
        }

        $filters = [];
        if (!empty($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        if (!empty($_GET['page'])) {
            $filters['page'] = $_GET['page'];
        }
        if (!empty($_GET['per_page'])) {
            $filters['per_page'] = $_GET['per_page'];
        }

        $result = getAllReservations($filters);

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
    // UPDATE RESERVATION STATUS (Admin only)
    // ---------------------------------------------------------
    case 'update_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
        }

        $admin = requireAuth('admin');
        if (!$admin) {
            jsonResponse(['success' => false, 'error' => 'Admin access required.'], 403);
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
        jsonResponse(['success' => false, 'error' => 'Invalid action. Supported: create, user, cancel, all, update_status.'], 400);
        break;
}
