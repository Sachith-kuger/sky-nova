import pymysql
pymysql.install_as_MySQLdb()
from flask import Flask, jsonify, render_template, request, session, redirect, url_for, flash
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import random
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'aero_secret_key_123'

import os

app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQL_PORT', 38216))
mysql = MySQL(app)

# ================= HELPER =================
def get_current_user():
    if session.get('user_logged_in'):
        return {'id': session.get('user_id'), 'first': session.get('user_first'), 'last': session.get('user_last'), 'email': session.get('user_email')}
    return None

# ================= PAGE ROUTES =================

@app.route('/')
def home():
    cur = mysql.connection.cursor()
    cur.execute("SELECT DISTINCT city FROM Airports ORDER BY city")
    airports = [row[0] for row in cur.fetchall()]
    cur.close()
    return render_template('index.html', airports=airports, user=get_current_user())

@app.route('/search')
def search():
    cur = mysql.connection.cursor()
    cur.execute("SELECT DISTINCT city FROM Airports ORDER BY city")
    airports = [row[0] for row in cur.fetchall()]
    cur.close()
    return render_template('search.html', airports=airports, user=get_current_user())

@app.route('/booking')
def booking():
    if not session.get('user_logged_in'):
        return redirect(url_for('user_login'))
    return render_template('booking.html', user=get_current_user())

@app.route('/my-bookings')
def my_bookings():
    if not session.get('user_logged_in'):
        return redirect(url_for('user_login'))
    return render_template('my_bookings.html', user=get_current_user())

@app.route('/booking-confirmation/<int:booking_id>')
def booking_confirmation(booking_id):
    return render_template('confirmation.html', booking_id=booking_id, user=get_current_user())

@app.route('/register')
def register():
    return render_template('register.html', user=get_current_user())

@app.route('/about')
def about():
    return render_template('about.html', user=get_current_user())

@app.route('/contact')
def contact():
    return render_template('contact.html', user=get_current_user())

# ================= USER AUTH =================

@app.route('/login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()
        cur = mysql.connection.cursor()
        cur.execute("SELECT user_id, first_name, last_name, email, password_hash FROM Users WHERE email=%s", (email,))
        user = cur.fetchone()
        cur.close()
        if user and user[4] and check_password_hash(user[4], password):
            session['user_logged_in'] = True
            session['user_id'] = user[0]
            session['user_first'] = user[1]
            session['user_last'] = user[2]
            session['user_email'] = user[3]
            next_url = request.args.get('next', url_for('home'))
            return redirect(next_url)
        return render_template('user_login.html', error="Invalid email or password", user=None)
    return render_template('user_login.html', user=None)

@app.route('/signup', methods=['GET', 'POST'])
def user_signup():
    if request.method == 'POST':
        first = request.form.get('firstName', '').strip()
        last = request.form.get('lastName', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()
        phone = request.form.get('phone', '').strip()
        if not all([first, last, email, password]):
            return render_template('user_signup.html', error="All fields are required", user=None)
        cur = mysql.connection.cursor()
        cur.execute("SELECT user_id FROM Users WHERE email=%s", (email,))
        if cur.fetchone():
            cur.close()
            return render_template('user_signup.html', error="Email already registered. Please login.", user=None)
        pw_hash = generate_password_hash(password)
        cur.execute("INSERT INTO Users (first_name, last_name, email, password_hash, phone) VALUES (%s,%s,%s,%s,%s)",
                    (first, last, email, pw_hash, phone))
        mysql.connection.commit()
        uid = cur.lastrowid
        cur.close()
        session['user_logged_in'] = True
        session['user_id'] = uid
        session['user_first'] = first
        session['user_last'] = last
        session['user_email'] = email
        return redirect(url_for('home'))
    return render_template('user_signup.html', user=None)

@app.route('/logout')
def user_logout():
    keys = ['user_logged_in','user_id','user_first','user_last','user_email']
    for k in keys:
        session.pop(k, None)
    return redirect(url_for('home'))

# ================= ADMIN AUTH =================

@app.route('/dashboard')
def dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('dashboard.html')

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        cur = mysql.connection.cursor()
        cur.execute("SELECT password_hash FROM Admins WHERE username=%s", (username,))
        admin = cur.fetchone()
        cur.close()
        if admin and check_password_hash(admin[0], password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            return redirect(url_for('dashboard'))
        return render_template('login.html', error="Invalid username or password")
    return render_template('login.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    return redirect(url_for('home'))

@app.route('/admin/flights')
def admin_flights():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('admin_flights.html')

@app.route('/admin/passengers')
def admin_passengers():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('admin_passengers.html')

@app.route('/admin/bookings')
def admin_bookings():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    return render_template('admin_bookings.html')

# ================= API: FLIGHT SEARCH =================

@app.route('/api/flights/search', methods=['GET'])
def search_flights():
    dep_city = request.args.get('dep', '')
    arr_city = request.args.get('arr', '')
    dep_date = request.args.get('date', '')
    passengers = int(request.args.get('passengers', 1))
    travel_class = request.args.get('class', 'economy')

    if dep_city and arr_city and dep_city.strip().lower() == arr_city.strip().lower():
        return jsonify([])

    cur = mysql.connection.cursor()

    # Auto-seed if empty
    try:
        cur.execute("SELECT COUNT(*) FROM Airports")
        if cur.fetchone()[0] == 0:
            for code, name, city, country in [
                ('BLR','Kempegowda','Bengaluru','India'),
                ('MAA','Chennai Int','Chennai','India'),
                ('DEL','Indira Gandhi','New Delhi','India'),
                ('BOM','Chhatrapati','Mumbai','India'),
                ('HYD','Rajiv Gandhi','Hyderabad','India'),
                ('CCU','Netaji Subhas','Kolkata','India'),
                ('GOI','Dabolim','Goa','India'),
                ('JAI','Jaipur Int','Jaipur','India'),
                ('JFK','John F. Kennedy International','New York','USA'),
                ('HND','Haneda','Tokyo','Japan')
            ]:
                cur.execute("INSERT IGNORE INTO Airports (airport_code,airport_name,city,country) VALUES (%s,%s,%s,%s)", (code,name,city,country))
            mysql.connection.commit()
    except:
        pass

    query = """
        SELECT f.flight_id, f.airline_name, a1.city, a2.city, a1.airport_code, a2.airport_code,
               f.departure_time, f.base_price, f.available_seats
        FROM Flights f
        JOIN Airports a1 ON f.departure_airport = a1.airport_code
        JOIN Airports a2 ON f.arrival_airport = a2.airport_code
        WHERE a1.city LIKE %s AND a2.city LIKE %s AND f.available_seats >= %s
    """
    params = [f"%{dep_city}%", f"%{arr_city}%", passengers]

    if dep_date:
        query += " AND DATE(departure_time) = %s"
        params.append(dep_date)

    query += " ORDER BY f.base_price ASC"
    cur.execute(query, tuple(params))
    rows = cur.fetchall()



    cur.close()

    class_mult = {'economy': 1, 'business': 1.8, 'first': 3.0}
    mult = class_mult.get(travel_class, 1)

    result = []
    for r in rows:
        dep_time = r[6]
        base = float(r[7])
        price_per = round(base * mult)
        duration_min = random.randint(60, 300)
        hours = duration_min // 60
        mins = duration_min % 60
        stops = random.choice([0, 0, 0, 1, 1, 2])
        result.append({
            "id": r[0], "airline": r[1],
            "dep_city": r[2], "arr_city": r[3],
            "dep_code": r[4], "arr_code": r[5],
            "dep_time": dep_time.strftime("%H:%M") if dep_time else "N/A",
            "dep_date": dep_time.strftime("%Y-%m-%d") if dep_time else "",
            "arr_time": (dep_time + timedelta(minutes=duration_min)).strftime("%H:%M") if dep_time else "N/A",
            "duration": f"{hours}h {mins}m",
            "stops": stops,
            "stops_text": "Non-stop" if stops == 0 else f"{stops} stop{'s' if stops > 1 else ''}",
            "price": price_per,
            "total_price": price_per * passengers,
            "seats": r[8],
            "class": travel_class
        })
    return jsonify(result)

@app.route('/api/flights/all', methods=['GET'])
def get_all_flights():
    cur = mysql.connection.cursor()
    cur.execute("SELECT flight_id, airline_name, departure_city, arrival_city, base_price FROM FlightDetailsView")
    rows = cur.fetchall()
    cur.close()
    return jsonify([{"id": r[0], "label": f"Flight {r[0]}: {r[2]} to {r[3]} ({r[1]}) - ₹{r[4]}"} for r in rows])

# ================= API: BOOKING =================

@app.route('/api/bookings/book', methods=['POST'])
def book_ticket():
    if not session.get('user_logged_in'):
        return jsonify({"success": False, "message": "Please login to book flights"}), 401
    data = request.json
    flight_id = data.get('flightId')
    passengers_count = int(data.get('passengers', 1))
    travel_class = data.get('class', 'economy')
    travelers = data.get('travelers', [])

    # If user is logged in and no travelers provided, use session
    if not travelers and session.get('user_logged_in'):
        travelers = [{'firstName': session['user_first'], 'lastName': session['user_last'], 'email': session['user_email']}]
    
    if not travelers:
        return jsonify({"success": False, "message": "Please provide traveler details"}), 400

    cur = mysql.connection.cursor()
    booking_ids = []
    
    # Ensure columns exist
    for col in ['booked_by INT NULL', 'booking_group VARCHAR(36) NULL', "travel_class VARCHAR(20) DEFAULT 'economy'"]:
        try:
            cur.execute(f"ALTER TABLE Bookings ADD COLUMN {col}")
            mysql.connection.commit()
        except:
            mysql.connection.rollback()
            
    try:
        cur.execute("ALTER TABLE Passengers ADD COLUMN travel_class VARCHAR(20) DEFAULT 'economy'")
        mysql.connection.commit()
    except:
        mysql.connection.rollback()
        
    try:
        cur.execute("DROP TRIGGER IF EXISTS calc_paid_amount")
        cur.execute("DROP TRIGGER IF EXISTS before_booking_insert")
        cur.execute("DROP TRIGGER IF EXISTS trigger_booking_insert")
        mysql.connection.commit()
    except:
        mysql.connection.rollback()
    
    import uuid
    group_id = str(uuid.uuid4())[:8]  # Short group ID
    
    try:
        for i, t in enumerate(travelers):
            fn = t.get('firstName', '')
            ln = t.get('lastName', '')
            em = t.get('email', '')
            t_class = t.get('travelClass', travel_class)
            
            # Always create a new passenger record for each ticket
            cur.execute("INSERT INTO Passengers (first_name, last_name, email, travel_class) VALUES (%s,%s,%s,%s)", (fn, ln, em, t_class))
            mysql.connection.commit()
            pid = cur.lastrowid

            seat = t.get('seat', f"{random.randint(1,30)}{random.choice('ABCDEF')}")
            cur.execute("SELECT base_price FROM Flights WHERE flight_id=%s", (flight_id,))
            price_row = cur.fetchone()
            price = float(price_row[0]) if price_row else 0
            class_mult = {'economy': 1, 'business': 1.8, 'first': 3.0}
            clean_class = t_class.lower().strip()
            paid = round(price * class_mult.get(clean_class, 1) * 1.05)
            
            # Print for debug server logs
            print(f"DEBUG: pax={fn}, class={t_class}, paid={paid}")
            
            cur.execute("INSERT INTO Bookings (passenger_id, flight_id, seat_number, paid_amount, status, booked_by, booking_group, travel_class) VALUES (%s,%s,%s,%s,'Confirmed',%s,%s,%s)",
                        (pid, flight_id, seat, paid, session['user_id'], group_id, t_class))
            bid = cur.lastrowid
            mysql.connection.commit()
            
            # Force update paid_amount to override any database triggers
            cur.execute("UPDATE Bookings SET paid_amount=%s WHERE booking_id=%s", (paid, bid))
            mysql.connection.commit()
            
            cur.execute("UPDATE Flights SET available_seats = available_seats - 1 WHERE flight_id=%s AND available_seats > 0", (flight_id,))
            mysql.connection.commit()
            
            booking_ids.append(bid)
        
        cur.close()
        return jsonify({
            "success": True,
            "message": f"Successfully booked {len(booking_ids)} tickets!",
            "booking_ids": booking_ids,
            "primary_booking_id": booking_ids[0] if booking_ids else None
        })
    except Exception as e:
        cur.close()
        return jsonify({"success": False, "message": f"Booking error: {str(e)}"}), 400

@app.route('/api/admin/fix-prices', methods=['GET'])
def api_fix_prices():
    cur = mysql.connection.cursor()
    cur.execute("SELECT booking_id, flight_id, travel_class FROM Bookings")
    bookings = cur.fetchall()
    
    class_mult = {'economy': 1, 'business': 1.8, 'first': 3.0}
    fixed = 0
    
    for b in bookings:
        bid, fid, tclass = b
        if tclass:
            cur.execute("SELECT base_price FROM Flights WHERE flight_id=%s", (fid,))
            pr = cur.fetchone()
            if pr:
                price = float(pr[0])
                clean_class = tclass.lower().strip()
                correct_paid = round(price * class_mult.get(clean_class, 1) * 1.05)
                cur.execute("UPDATE Bookings SET paid_amount=%s WHERE booking_id=%s", (correct_paid, bid))
                fixed += 1
                
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True, "message": f"Fixed {fixed} booking prices."})

@app.route('/api/admin/clear-data', methods=['GET'])
def api_clear_data():
    cur = mysql.connection.cursor()
    try:
        cur.execute("SET SQL_SAFE_UPDATES = 0")
    except:
        pass
    cur.execute("DELETE FROM Bookings WHERE 1=1")
    cur.execute("ALTER TABLE Bookings AUTO_INCREMENT = 1")
    cur.execute("DELETE FROM Passengers WHERE 1=1")
    cur.execute("ALTER TABLE Passengers AUTO_INCREMENT = 1")
    try:
        cur.execute("DELETE FROM Users WHERE 1=1")
        cur.execute("ALTER TABLE Users AUTO_INCREMENT = 1")
    except:
        pass
    cur.execute("UPDATE Flights SET available_seats = 150")
    mysql.connection.commit()
    cur.close()
    return "All Passengers, Bookings, and Users data wiped completely! You can now start your fresh test."

# ================= API: MY BOOKINGS =================

@app.route('/api/my-bookings', methods=['GET'])
def api_my_bookings():
    if not session.get('user_logged_in'):
        return jsonify([])
    uid = session['user_id']
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT b.booking_id, f.airline_name, a1.city, a2.city, a1.airport_code, a2.airport_code,
               f.departure_time, b.seat_number, b.paid_amount, b.booking_date, b.status, f.flight_id,
               p.first_name, p.last_name, b.booking_group, b.travel_class
        FROM Bookings b
        JOIN Flights f ON b.flight_id = f.flight_id
        JOIN Airports a1 ON f.departure_airport = a1.airport_code
        JOIN Airports a2 ON f.arrival_airport = a2.airport_code
        JOIN Passengers p ON b.passenger_id = p.passenger_id
        WHERE p.email = %s OR b.booked_by = %s
        ORDER BY b.booking_id DESC
    """, (session['user_email'], uid))
    rows = cur.fetchall()
    cur.close()
    
    # Group by booking_group
    from collections import OrderedDict
    groups = OrderedDict()
    for r in rows:
        grp = r[14] or f"solo_{r[0]}"  # fallback for old bookings without group
        if grp not in groups:
            groups[grp] = {
                "group_id": grp,
                "primary_id": r[0],
                "airline": r[1], "dep_city": r[2], "arr_city": r[3],
                "dep_code": r[4], "arr_code": r[5],
                "dep_time": r[6].strftime("%Y-%m-%d %H:%M") if r[6] else "N/A",
                "booked_on": r[9].strftime("%Y-%m-%d %H:%M") if r[9] else "N/A",
                "status": r[10], "flight_id": r[11],
                "passengers": [],
                "total_paid": 0,
                "booking_ids": []
            }
        groups[grp]["passengers"].append({
            "name": f"{r[12]} {r[13]}",
            "seat": r[7],
            "paid": float(r[8]) if r[8] else 0,
            "booking_id": r[0],
            "class": r[15].capitalize() if r[15] else "Economy",
            "status": r[10]
        })
        groups[grp]["total_paid"] += float(r[8]) if r[8] else 0
        groups[grp]["booking_ids"].append(r[0])
        
    for grp in groups.values():
        statuses = [p["status"] for p in grp["passengers"]]
        if all(s == 'Cancelled' for s in statuses):
            grp["status"] = "Cancelled"
        elif any(s == 'Cancelled' for s in statuses):
            grp["status"] = "Partially Cancelled"
        else:
            grp["status"] = statuses[0]
            
    return jsonify(list(groups.values()))

@app.route('/api/bookings/cancel', methods=['POST'])
def cancel_booking():
    if not session.get('user_logged_in'):
        return jsonify({"success": False, "message": "Not logged in"}), 401
    data = request.json
    bid = data.get('bookingId')
    cur = mysql.connection.cursor()
    
    cur.execute("SELECT status, flight_id, paid_amount FROM Bookings WHERE booking_id=%s AND (booked_by=%s OR passenger_id IN (SELECT passenger_id FROM Passengers WHERE email=%s))", (bid, session['user_id'], session['user_email']))
    row = cur.fetchone()
    
    if not row:
        cur.close()
        return jsonify({"success": False, "message": "Booking not found or unauthorized."}), 404
        
    if row[0] == 'Cancelled':
        cur.close()
        return jsonify({"success": False, "message": "Booking is already cancelled."}), 400
        
    cur.execute("UPDATE Bookings SET status='Cancelled' WHERE booking_id=%s", (bid,))
    
    # Restore seat
    cur.execute("UPDATE Flights SET available_seats = available_seats + 1 WHERE flight_id=%s", (row[1],))
    
    mysql.connection.commit()
    cur.close()
    
    refund_amount = float(row[2]) if row[2] else 0
    return jsonify({"success": True, "message": f"Booking cancelled successfully. ₹{refund_amount} refund initiated."})

@app.route('/api/booking/<int:booking_id>', methods=['GET'])
def api_booking_detail(booking_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT b.booking_id, f.airline_name, a1.city, a2.city, a1.airport_code, a2.airport_code,
               f.departure_time, b.seat_number, b.paid_amount, b.booking_date, b.status,
               p.first_name, p.last_name, p.email, f.flight_id, b.booking_group, b.travel_class
        FROM Bookings b
        JOIN Flights f ON b.flight_id = f.flight_id
        JOIN Airports a1 ON f.departure_airport = a1.airport_code
        JOIN Airports a2 ON f.arrival_airport = a2.airport_code
        JOIN Passengers p ON b.passenger_id = p.passenger_id
        WHERE b.booking_id = %s
    """, (booking_id,))
    r = cur.fetchone()
    if not r:
        cur.close()
        return jsonify({"error": "Booking not found"}), 404
    
    # Get all travelers in the same group
    travelers = []
    group = r[15]
    if group:
        cur.execute("""
            SELECT b.booking_id, p.first_name, p.last_name, b.seat_number, b.paid_amount, b.travel_class, b.status
            FROM Bookings b JOIN Passengers p ON b.passenger_id = p.passenger_id
            WHERE b.booking_group = %s ORDER BY b.booking_id
        """, (group,))
        for tr in cur.fetchall():
            travelers.append({"id": tr[0], "name": f"{tr[1]} {tr[2]}", "seat": tr[3], "paid": float(tr[4]) if tr[4] else 0, "class": tr[5].capitalize() if tr[5] else "Economy", "status": tr[6]})
    else:
        travelers.append({"id": r[0], "name": f"{r[11]} {r[12]}", "seat": r[7], "paid": float(r[8]) if r[8] else 0, "class": r[16].capitalize() if r[16] else "Economy", "status": r[10]})
    
    total_paid = sum(t["paid"] for t in travelers)
    cur.close()
    return jsonify({
        "id": r[0], "airline": r[1], "dep_city": r[2], "arr_city": r[3],
        "dep_code": r[4], "arr_code": r[5],
        "dep_time": r[6].strftime("%Y-%m-%d %H:%M") if r[6] else "N/A",
        "dep_date_formatted": r[6].strftime("%a, %d %b %Y") if r[6] else "",
        "dep_time_only": r[6].strftime("%H:%M") if r[6] else "",
        "seat": r[7], "paid": total_paid,
        "booked_on": r[9].strftime("%Y-%m-%d %H:%M") if r[9] else "N/A",
        "status": r[10], "passenger_name": f"{r[11]} {r[12]}",
        "passenger_email": r[13], "flight_id": r[14],
        "pnr": f"SN{r[14]:03d}{r[0]:04d}",
        "travelers": travelers
    })

# ================= API: CONTACT =================

@app.route('/api/contact', methods=['POST'])
def api_contact():
    data = request.json
    # In production, send email. Here just acknowledge.
    return jsonify({"success": True, "message": "Your message has been sent! We'll get back to you within 24 hours."})

# ================= API: REGISTER PASSENGER =================

@app.route('/api/passengers/register', methods=['POST'])
def register_passenger():
    data = request.json
    first_name = data.get('firstName')
    last_name = data.get('lastName')
    email = data.get('email')
    cur = mysql.connection.cursor()
    try:
        cur.execute("INSERT INTO Passengers (first_name, last_name, email) VALUES (%s, %s, %s)", (first_name, last_name, email))
        mysql.connection.commit()
        pid = cur.lastrowid
        cur.close()
        return jsonify({"success": True, "message": f"Passenger {first_name} {last_name} registered successfully", "id": pid})
    except Exception as e:
        cur.close()
        return jsonify({"success": False, "message": str(e)}), 400

# ================= API: INSIGHTS =================

@app.route('/api/insights/busiest-routes')
def get_busiest_routes():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT a1.city, a2.city, COUNT(b.booking_id) FROM Bookings b
        JOIN Flights f ON b.flight_id=f.flight_id JOIN Airports a1 ON f.departure_airport=a1.airport_code
        JOIN Airports a2 ON f.arrival_airport=a2.airport_code GROUP BY f.departure_airport,f.arrival_airport ORDER BY COUNT(b.booking_id) DESC""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"departure":r[0],"arrival":r[1],"count":r[2]} for r in rows])

@app.route('/api/insights/high-value-customers')
def get_high_value_passengers():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT p.first_name,p.last_name,SUM(b.paid_amount) FROM Passengers p
        JOIN Bookings b ON p.passenger_id=b.passenger_id
        GROUP BY p.passenger_id HAVING SUM(b.paid_amount) > (SELECT AVG(paid_amount) FROM Bookings)
        ORDER BY SUM(b.paid_amount) DESC LIMIT 10""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"name":f"{r[0]} {r[1]}","spent":float(r[2])} for r in rows])

@app.route('/api/insights/dominant-airlines')
def get_dominant_airlines():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT a.city,f.airline_name,COUNT(*) FROM Flights f
        JOIN Airports a ON f.departure_airport=a.airport_code GROUP BY a.city,f.airline_name""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"city":r[0],"airline":r[1],"flights":r[2]} for r in rows])

@app.route('/api/insights/occupancy')
def get_flight_occupancy():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT f.flight_id,f.airline_name,(COUNT(b.booking_id)/150)*100 AS occ FROM Flights f
        LEFT JOIN Bookings b ON f.flight_id=b.flight_id GROUP BY f.flight_id ORDER BY occ DESC""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"flight_id":r[0],"airline":r[1],"occupancy":round(float(r[2]),2)} for r in rows])

@app.route('/api/insights/recent-traffic')
def get_recent_traffic():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT p.first_name,p.last_name,f.departure_time,f.airline_name FROM Passengers p
        JOIN Bookings b ON p.passenger_id=b.passenger_id JOIN Flights f ON b.flight_id=f.flight_id
        WHERE f.departure_time>=NOW()-INTERVAL 1 DAY""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"passenger":f"{r[0]} {r[1]}","time":str(r[2]),"airline":r[3]} for r in rows])

# ================= API: ADMIN =================

@app.route('/api/admin/flights')
def api_admin_flights():
    cur = mysql.connection.cursor()
    # Ensure columns exist
    try:
        cur.execute("ALTER TABLE Flights ADD COLUMN status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled'")
        mysql.connection.commit()
    except:
        mysql.connection.rollback()
    
    try:
        cur.execute("ALTER TABLE Bookings MODIFY status ENUM('Confirmed', 'Cancelled', 'Completed') DEFAULT 'Confirmed'")
        mysql.connection.commit()
    except:
        mysql.connection.rollback()

    cur.execute("""SELECT f.flight_id,f.airline_name,a1.city,a2.city,f.departure_time,f.base_price,f.available_seats,f.status
        FROM Flights f JOIN Airports a1 ON f.departure_airport=a1.airport_code
        JOIN Airports a2 ON f.arrival_airport=a2.airport_code ORDER BY f.departure_time DESC""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"id":r[0],"airline":r[1],"dep":r[2],"arr":r[3],
        "time":r[4].strftime("%Y-%m-%d %H:%M") if r[4] else "N/A","price":float(r[5]),"seats":r[6],"status":r[7] if len(r)>7 and r[7] else "Scheduled"} for r in rows])

@app.route('/api/admin/flights/<int:flight_id>/complete', methods=['POST'])
def complete_flight(flight_id):
    if not session.get('admin_logged_in'):
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    cur = mysql.connection.cursor()
    
    # Update flight status
    cur.execute("UPDATE Flights SET status='Completed' WHERE flight_id=%s", (flight_id,))
    
    # Update all confirmed bookings for this flight to 'Completed'
    cur.execute("UPDATE Bookings SET status='Completed' WHERE flight_id=%s AND status='Confirmed'", (flight_id,))
    
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True, "message": "Flight marked as completed successfully"})

@app.route('/api/admin/flights/<int:flight_id>/reschedule', methods=['POST'])
def reschedule_flight_admin(flight_id):
    if not session.get('admin_logged_in'):
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    new_time_str = data.get('new_time')
    if not new_time_str:
        return jsonify({"success": False, "message": "New time is required"}), 400
        
    try:
        new_time = datetime.strptime(new_time_str, "%Y-%m-%d %H:%M")
    except ValueError:
        return jsonify({"success": False, "message": "Invalid time format. Please use YYYY-MM-DD HH:MM"}), 400

    cur = mysql.connection.cursor()
    cur.execute("UPDATE Flights SET departure_time=%s, status='Scheduled' WHERE flight_id=%s", (new_time, flight_id))
    # If the flight was completed, bookings were also completed. Revert them to Confirmed.
    cur.execute("UPDATE Bookings SET status='Confirmed' WHERE flight_id=%s AND status='Completed'", (flight_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True, "message": "Flight rescheduled successfully"})

@app.route('/api/admin/passengers')
def api_admin_passengers():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT p.passenger_id, p.first_name, p.last_name, p.email, COUNT(b.booking_id)
        FROM Passengers p
        LEFT JOIN Bookings b ON p.passenger_id = b.passenger_id
        GROUP BY p.passenger_id, p.first_name, p.last_name, p.email
        ORDER BY p.passenger_id DESC
    """)
    rows = cur.fetchall()
    cur.close()
    return jsonify([{"id":r[0],"first":r[1],"last":r[2],"email":r[3],"bookings":f"{r[4]} Trips"} for r in rows])

@app.route('/api/admin/bookings')
def api_admin_bookings():
    cur = mysql.connection.cursor()
    cur.execute("""SELECT b.booking_id,CONCAT(p.first_name,' ',p.last_name),f.airline_name,a1.city,a2.city,
        b.seat_number,b.paid_amount,b.booking_date,b.status,b.travel_class FROM Bookings b
        JOIN Passengers p ON b.passenger_id=p.passenger_id JOIN Flights f ON b.flight_id=f.flight_id
        JOIN Airports a1 ON f.departure_airport=a1.airport_code JOIN Airports a2 ON f.arrival_airport=a2.airport_code
        ORDER BY b.booking_id DESC""")
    rows = cur.fetchall(); cur.close()
    return jsonify([{"id":r[0],"passenger":r[1],"airline":r[2],"dep":r[3],"arr":r[4],"seat":r[5],
        "paid":float(r[6]) if r[6] else 0,"date":r[7].strftime("%Y-%m-%d %H:%M") if r[7] else "N/A","status":r[8],"class":str(r[9]).capitalize() if len(r)>9 and r[9] else "Economy"} for r in rows])

@app.route('/api/debug')
def debug_db():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM Airports"); airports = cur.fetchall()
        cur.execute("SELECT * FROM Flights"); flights = cur.fetchall()
        cur.close()
        cur.close()
        return jsonify({"airports": airports, "flights": flights})
    except Exception as e:
        return str(e)

if __name__ == '__main__':
    app.run(debug=True)