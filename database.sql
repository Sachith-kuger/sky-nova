CREATE DATABASE airline_system;
USE airline_system;


CREATE TABLE Airports (
    airport_code VARCHAR(10) PRIMARY KEY,
    airport_name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL
);


CREATE TABLE Flights (
    flight_id INT AUTO_INCREMENT PRIMARY KEY,
    airline_name VARCHAR(50) NOT NULL,
    departure_airport VARCHAR(10),
    arrival_airport VARCHAR(10),
    departure_time DATETIME,
    base_price DECIMAL(10, 2) CHECK (base_price >= 0),
    available_seats INT DEFAULT 150 CHECK (available_seats >= 0),
    FOREIGN KEY (departure_airport) REFERENCES Airports(airport_code),
    FOREIGN KEY (arrival_airport) REFERENCES Airports(airport_code),
    CHECK (departure_airport != arrival_airport)
);


CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    phone VARCHAR(20)
);

CREATE TABLE Passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100)
);


CREATE TABLE Bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT,
    passenger_id INT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seat_number VARCHAR(10),
    paid_amount DECIMAL(10, 2),
    status ENUM('Confirmed', 'Cancelled') DEFAULT 'Confirmed',
    FOREIGN KEY (flight_id) REFERENCES Flights(flight_id),
    FOREIGN KEY (passenger_id) REFERENCES Passengers(passenger_id)
);

CREATE TABLE Admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

INSERT INTO Admins (username, password_hash) VALUES ('admin', 'scrypt:32768:8:1$ybvzSE4A6fzjISjG$6aeea34658b80bfd801b9a2cbb428d97e93e4a02762ccb3a90598ba26059350719074d6bb061b99b67229a776d0d4e2f5f5b8a68cf937397ccb10dedbf05d101');

-- ==========================================
-- ADVANCED DATABASE OBJECTS
-- ==========================================

-- 1. VIEW: Simplifies the retrieval of detailed flight information
CREATE VIEW FlightDetailsView AS
SELECT 
    f.flight_id, 
    f.airline_name, 
    a1.city AS departure_city, 
    a2.city AS arrival_city, 
    f.departure_time, 
    f.base_price
FROM Flights f
JOIN Airports a1 ON f.departure_airport = a1.airport_code
JOIN Airports a2 ON f.arrival_airport = a2.airport_code;

-- 2. TRIGGER: Check seat availability and assign price before booking
DELIMITER //
CREATE TRIGGER Before_Booking_Insert
BEFORE INSERT ON Bookings
FOR EACH ROW
BEGIN
    DECLARE current_seats INT;
    DECLARE current_price DECIMAL(10, 2);

    -- Get current seats and price for the flight
    SELECT available_seats, base_price INTO current_seats, current_price
    FROM Flights WHERE flight_id = NEW.flight_id;

    IF current_seats <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Flight is fully booked';
    ELSE
        -- Set the paid amount to the current base price
        SET NEW.paid_amount = current_price;
    END IF;
END //
DELIMITER ;

-- 3. TRIGGER: Decrement available seats after successful booking
DELIMITER //
CREATE TRIGGER After_Booking_Insert
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    UPDATE Flights SET available_seats = available_seats - 1 WHERE flight_id = NEW.flight_id;
END //
DELIMITER ;

-- 4. STORED PROCEDURE: Encapsulates the logic of registering a passenger and booking a flight
DELIMITER //
CREATE PROCEDURE BookFlightTicket(
    IN p_first_name VARCHAR(50),
    IN p_last_name VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_flight_id INT,
    IN p_seat_number VARCHAR(10)
)
BEGIN
    DECLARE v_passenger_id INT;
    
    -- Check if passenger exists
    SELECT passenger_id INTO v_passenger_id FROM Passengers WHERE email = p_email LIMIT 1;
    
    -- If not, insert new passenger
    IF v_passenger_id IS NULL THEN
        INSERT INTO Passengers (first_name, last_name, email) VALUES (p_first_name, p_last_name, p_email);
        SET v_passenger_id = LAST_INSERT_ID();
    END IF;
    
    -- Insert the booking (Trigger will handle price and seats)
    INSERT INTO Bookings (flight_id, passenger_id, seat_number, status) 
    VALUES (p_flight_id, v_passenger_id, p_seat_number, 'Confirmed');
END //
DELIMITER ;
