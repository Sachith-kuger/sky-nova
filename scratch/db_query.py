import mysql.connector

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="root123",
        database="airline_system",
        port=3307
    )
    cursor = conn.cursor()
    cursor.execute("DESCRIBE Bookings")
    for row in cursor.fetchall():
        print(row)
    cursor.close()
    conn.close()
except Exception as e:
    print(e)
