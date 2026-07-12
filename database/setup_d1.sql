-- ============================================================
-- LuxeStay Hotel - Cloudflare D1 (SQLite) Setup Script
-- ============================================================
-- All seed user passwords are: 'password'
-- ============================================================

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS users;

-- -----------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT DEFAULT NULL,
    role TEXT CHECK(role IN ('guest', 'admin')) NOT NULL DEFAULT 'guest',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- Table: room_types
-- -----------------------------------------------------------
CREATE TABLE room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    base_price REAL NOT NULL,
    capacity INTEGER NOT NULL,
    size_sqm INTEGER NOT NULL,
    amenities TEXT NOT NULL, -- JSON stored as string
    image_url TEXT DEFAULT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 -- 1 = true, 0 = false
);

-- -----------------------------------------------------------
-- Table: rooms
-- -----------------------------------------------------------
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL,
    room_number TEXT NOT NULL UNIQUE,
    floor INTEGER NOT NULL,
    status TEXT CHECK(status IN ('available', 'occupied', 'maintenance')) NOT NULL DEFAULT 'available',
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------
-- Table: reservations
-- -----------------------------------------------------------
CREATE TABLE reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    check_in TEXT NOT NULL, -- Y-m-d format
    check_out TEXT NOT NULL, -- Y-m-d format
    total_price REAL NOT NULL,
    guests_count INTEGER NOT NULL,
    special_requests TEXT DEFAULT NULL,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------------
-- Table: reviews
-- -----------------------------------------------------------
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_type_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add indexes for common queries
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users (password for ALL users is: 'password')
-- SHA-256 hash with salt (Cloudflare Workers compatible)
INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('Admin LuxeStay', 'admin@luxestay.com', 'sha256:0102030405060708090a0b0c0d0e0f10:b70aa4cff112d5ea64feee3f1015ce7f9a4dce966cfc5b1b26251533862eb6e6', '+1-555-000-0001', 'admin'),
('James Whitfield', 'james.whitfield@email.com', 'sha256:0102030405060708090a0b0c0d0e0f10:b70aa4cff112d5ea64feee3f1015ce7f9a4dce966cfc5b1b26251533862eb6e6', '+1-555-234-5678', 'guest'),
('Sophia Martinez', 'sophia.martinez@email.com', 'sha256:0102030405060708090a0b0c0d0e0f10:b70aa4cff112d5ea64feee3f1015ce7f9a4dce966cfc5b1b26251533862eb6e6', '+1-555-876-5432', 'guest');

-- Room Types
INSERT INTO room_types (name, slug, description, base_price, capacity, size_sqm, amenities, image_url) VALUES
(
    'Standard Room',
    'standard-room',
    'A refined retreat featuring elegant furnishings, premium bedding, and modern amenities. Our Standard Room offers a tranquil haven with city views, perfect for the discerning solo traveler or couple seeking understated luxury.',
    120.00,
    2,
    28,
    '["King-size bed", "City view", "Free Wi-Fi", "Flat-screen TV", "Mini fridge", "In-room safe", "Rain shower", "Complimentary toiletries", "Air conditioning", "Daily housekeeping"]',
    'assets/images/room-standard-room.jpg'
),
(
    'Superior Room',
    'superior-room',
    'Elevated comfort meets sophisticated design in our Superior Room. Enjoy a spacious layout with a dedicated seating area, premium entertainment system, and curated artwork. Wake to panoramic views through floor-to-ceiling windows.',
    180.00,
    2,
    35,
    '["King-size bed", "Panoramic city view", "Free Wi-Fi", "55-inch Smart TV", "Mini bar", "In-room safe", "Rain shower & bathtub", "Premium toiletries", "Air conditioning", "Nespresso machine", "Bathrobe & slippers", "Daily housekeeping"]',
    'assets/images/room-superior-room.jpg'
),
(
    'Deluxe Suite',
    'deluxe-suite',
    'Indulge in the spacious elegance of our Deluxe Suite, where a separate living area and bedroom create your private sanctuary. Featuring handpicked designer furniture, a marble bathroom with soaking tub, and attentive turndown service.',
    280.00,
    3,
    48,
    '["King-size bed", "Separate living area", "Skyline view", "Free Wi-Fi", "65-inch Smart TV", "Fully stocked mini bar", "In-room safe", "Marble bathroom", "Soaking tub & rain shower", "Luxury toiletries", "Air conditioning", "Nespresso machine", "Bathrobe & slippers", "Writing desk", "Turndown service", "Daily housekeeping"]',
    'assets/images/room-deluxe-suite.jpg'
),
(
    'Premium Suite',
    'premium-suite',
    'The Premium Suite offers an unrivaled experience with its expansive layout, private dining area, and stunning wraparound views. Enjoy a dedicated workspace, walk-in closet, and a master bathroom that rivals the finest spas.',
    420.00,
    4,
    65,
    '["King-size bed & sofa bed", "Separate living & dining area", "Wraparound views", "Free Wi-Fi", "75-inch Smart TV", "Second TV in bedroom", "Premium mini bar", "In-room safe", "Spa-like marble bathroom", "Jacuzzi tub & rain shower", "Luxury toiletries", "Air conditioning", "Espresso machine", "Bathrobe & slippers", "Walk-in closet", "Private dining area", "Turndown service", "24/7 concierge", "Daily housekeeping"]',
    'assets/images/room-premium-suite.jpg'
),
(
    'Presidential Suite',
    'presidential-suite',
    'The crown jewel of LuxeStay, our Presidential Suite is a palatial residence spanning an entire floor wing. Featuring a grand living room, formal dining for eight, private study, master suite with his-and-hers bathrooms, and a wraparound terrace with breathtaking skyline views. A dedicated butler attends to your every desire.',
    750.00,
    6,
    120,
    '["Master king-size bed", "Two additional bedrooms", "Grand living room", "Formal dining room (seats 8)", "Private study", "Wraparound terrace", "360-degree views", "Free Wi-Fi", "85-inch Smart TV", "Multiple TVs throughout", "Full premium bar", "In-room safe", "His & hers marble bathrooms", "Jacuzzi tub & steam shower", "Luxury Hermès toiletries", "Climate control per room", "Professional espresso machine", "Bathrobe & slippers", "Walk-in closets", "Grand piano", "Turndown service", "Dedicated butler", "Private chef on request", "Limousine airport transfer", "Daily housekeeping"]',
    'assets/images/room-presidential-suite.jpg'
);

-- Rooms (4 per type, floors 1-5)
-- Standard Rooms (Floor 1-2)
INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(1, '101', 1, 'available'),
(1, '102', 1, 'available'),
(1, '203', 2, 'occupied'),
(1, '204', 2, 'maintenance');

-- Superior Rooms (Floor 2-3)
INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(2, '205', 2, 'available'),
(2, '206', 2, 'available'),
(2, '301', 3, 'occupied'),
(2, '302', 3, 'available');

-- Deluxe Suites (Floor 3)
INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(3, '303', 3, 'available'),
(3, '304', 3, 'available'),
(3, '305', 3, 'occupied'),
(3, '306', 3, 'available');

-- Premium Suites (Floor 4)
INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(4, '401', 4, 'available'),
(4, '402', 4, 'available'),
(4, '403', 4, 'occupied'),
(4, '404', 4, 'available');

-- Presidential Suites (Floor 5)
INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(5, '501', 5, 'available'),
(5, '502', 5, 'available'),
(5, '503', 5, 'occupied'),
(5, '504', 5, 'available');

-- Reservations
-- 1. Past reservation – checked out (James)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(2, 1, '2026-06-10', '2026-06-13', 360.00, 2, 'Late check-out requested if possible.', 'checked_out', '2026-06-05 14:30:00');

-- 2. Past reservation – checked out (Sophia)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(3, 5, '2026-06-15', '2026-06-18', 540.00, 1, NULL, 'checked_out', '2026-06-10 09:15:00');

-- 3. Past reservation – cancelled (James)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(2, 9, '2026-06-20', '2026-06-23', 840.00, 3, 'Anniversary celebration – please arrange flowers.', 'cancelled', '2026-06-12 11:00:00');

-- 4. Currently checked in (Sophia)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(3, 3, '2026-07-03', '2026-07-08', 600.00, 2, 'Extra pillows please.', 'checked_in', '2026-06-28 16:45:00');

-- 5. Currently checked in (James)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(2, 7, '2026-07-04', '2026-07-09', 900.00, 2, 'Non-smoking room preferred.', 'checked_in', '2026-06-30 10:20:00');

-- 6. Currently checked in (Sophia)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(3, 11, '2026-07-02', '2026-07-07', 1400.00, 3, 'Vegan meal options for room service.', 'checked_in', '2026-06-25 08:30:00');

-- 7. Currently checked in (James)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(2, 15, '2026-07-01', '2026-07-06', 2100.00, 4, 'Business trip – need fast internet and desk lamp.', 'checked_in', '2026-06-20 13:00:00');

-- 8. Future reservation – confirmed (Sophia)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(3, 17, '2026-07-15', '2026-07-20', 3750.00, 5, 'Birthday celebration – can you arrange a cake and champagne?', 'confirmed', '2026-07-01 09:00:00');

-- 9. Future reservation – pending (James)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(2, 10, '2026-07-20', '2026-07-23', 840.00, 2, NULL, 'pending', '2026-07-04 17:30:00');

-- 10. Future reservation – pending (Sophia)
INSERT INTO reservations (user_id, room_id, check_in, check_out, total_price, guests_count, special_requests, status, created_at) VALUES
(3, 14, '2026-08-01', '2026-08-05', 1680.00, 3, 'Require airport pickup service.', 'pending', '2026-07-05 12:00:00');
