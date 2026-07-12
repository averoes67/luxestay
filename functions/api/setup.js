import { Hono } from 'hono'

const setupApp = new Hono()

setupApp.get('/', async (c) => {
  const db = c.env.DB
  if (!db) {
    return c.json({ error: 'Database connection failed' }, 500)
  }

  const sql = `
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'guest' CHECK(role IN ('admin', 'guest')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    base_price REAL NOT NULL,
    capacity INTEGER NOT NULL,
    size_sqm INTEGER,
    amenities TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_type_id INTEGER NOT NULL,
    room_number TEXT NOT NULL UNIQUE,
    floor INTEGER,
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
);

CREATE TABLE reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price REAL NOT NULL,
    guests_count INTEGER NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reservation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

INSERT INTO users (full_name, email, phone, password_hash, role) VALUES 
('Admin LuxeStay', 'admin@luxestay.com', '081234567890', '$2b$04$mscejQyr/9Qgd/coyIAeGOiJPsxUrUvlpKiBW2m9RLOcJMtIPXrJ2', 'admin');

INSERT INTO room_types (name, slug, description, base_price, capacity, size_sqm, amenities, image_url) VALUES
('Standard Room', 'standard-room', 'A refined retreat.', 120.00, 2, 28, '["King-size bed"]', 'assets/images/room-standard-room.jpg'),
('Superior Room', 'superior-room', 'Elevated comfort.', 180.00, 2, 35, '["King-size bed"]', 'assets/images/room-superior-room.jpg'),
('Deluxe Suite', 'deluxe-suite', 'Spacious elegance.', 280.00, 3, 48, '["King-size bed"]', 'assets/images/room-deluxe-suite.jpg'),
('Premium Suite', 'premium-suite', 'Unrivaled experience.', 420.00, 4, 65, '["King-size bed"]', 'assets/images/room-premium-suite.jpg'),
('Presidential Suite', 'presidential-suite', 'The crown jewel.', 750.00, 6, 120, '["Master king-size bed"]', 'assets/images/room-presidential-suite.jpg');

INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES
(1, '101', 1, 'available'), (1, '102', 1, 'available'), (2, '205', 2, 'available'), (2, '206', 2, 'available'), (3, '303', 3, 'available'), (3, '304', 3, 'available'), (4, '401', 4, 'available'), (4, '402', 4, 'available'), (5, '501', 5, 'available'), (5, '502', 5, 'available');
`;

  try {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const results = [];
    
    for (const statement of statements) {
      const { success } = await db.prepare(statement).run();
      results.push({ statement: statement.substring(0, 30) + '...', success });
    }

    return c.json({ success: true, message: 'Database setup complete!', results })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default setupApp
