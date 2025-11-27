import sqlite3
import os
from contextlib import contextmanager

class DatabaseConnection:
    def __init__(self):
        # SQLite database file path
        self.db_path = os.path.join(os.getcwd(), "employee_management.db")
        
    def get_connection(self):
        """Get a SQLite database connection"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable dictionary-like access to rows
            return conn
        except sqlite3.Error as e:
            print(f"Error connecting to database: {e}")
            raise
    
    @contextmanager
    def get_cursor(self, dict_cursor=True):
        """Context manager for database cursor"""
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            yield cursor, conn
            conn.commit()
        except sqlite3.Error as e:
            if conn:
                conn.rollback()
            print(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def create_tables(self):
        """Create the employee table if it doesn't exist"""
        create_table_query = """
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            contact TEXT NOT NULL,
            designation TEXT NOT NULL,
            salary REAL NOT NULL
        );
        """
        
        try:
            with self.get_cursor(dict_cursor=False) as (cursor, conn):
                cursor.execute(create_table_query)
                print("Employee table created successfully or already exists.")
        except sqlite3.Error as e:
            print(f"Error creating table: {e}")
            raise
