import MySQLdb

db = MySQLdb.connect(host="127.0.0.1", user="root", passwd="root123", db="airline_system", port=3307)
cursor = db.cursor()

cursor.execute("SELECT f.flight_id, a1.city, a2.city, f.departure_time FROM Flights f JOIN Airports a1 ON f.departure_airport = a1.airport_code JOIN Airports a2 ON f.arrival_airport = a2.airport_code;")
flights = cursor.fetchall()

print("Flights in DB:")
for f in flights:
    print(f)
    
db.close()
