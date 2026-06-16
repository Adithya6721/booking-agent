import sqlite3
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_FILE = "booking_agent.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            created_at TEXT
        )
    """)
    
    # Create chat history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            timestamp TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
        )
    """)
    
    # Create trip context table (state tracking)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_context (
            session_id TEXT PRIMARY KEY,
            origin TEXT,
            destination TEXT,
            travel_date TEXT,
            budget INTEGER,
            adults INTEGER DEFAULT 1,
            return_date TEXT,
            check_out_date TEXT,
            amenities TEXT,
            booking_stage TEXT DEFAULT 'IDLE',
            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
        )
    """)
    
    conn.commit()
    conn.close()

def get_or_create_session(session_id: Optional[str] = None) -> str:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if not session_id:
        session_id = f"session_{uuid.uuid4().hex[:8]}"
        cursor.execute("INSERT INTO sessions (session_id, created_at) VALUES (?, ?)", 
                       (session_id, datetime.now().isoformat()))
        cursor.execute("INSERT INTO trip_context (session_id) VALUES (?)", (session_id,))
    else:
        # Check if exists, if not create
        cursor.execute("SELECT session_id FROM sessions WHERE session_id = ?", (session_id,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO sessions (session_id, created_at) VALUES (?, ?)", 
                           (session_id, datetime.now().isoformat()))
            cursor.execute("INSERT INTO trip_context (session_id) VALUES (?)", (session_id,))
            
    conn.commit()
    conn.close()
    return session_id

def save_message(session_id: str, role: str, content: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, role, content, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_history(session_id: str, limit: int = 5) -> List[Dict[str, str]]:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
        (session_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    
    # Reverse to get chronological order
    history = [{"role": row[0], "content": row[1]} for row in reversed(rows)]
    return history

def update_trip_context(session_id: str, origin: Optional[str] = None, 
                        destination: Optional[str] = None, travel_date: Optional[str] = None, 
                        budget: Optional[int] = None, adults: Optional[int] = None,
                        return_date: Optional[str] = None, check_out_date: Optional[str] = None,
                        amenities: Optional[str] = None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    updates = []
    params = []
    if origin is not None:
        updates.append("origin = ?")
        params.append(origin)
    if destination is not None:
        updates.append("destination = ?")
        params.append(destination)
    if travel_date is not None:
        updates.append("travel_date = ?")
        params.append(travel_date)
    if budget is not None:
        updates.append("budget = ?")
        params.append(budget)
    if adults is not None:
        updates.append("adults = ?")
        params.append(adults)
    if return_date is not None:
        updates.append("return_date = ?")
        params.append(return_date)
    if check_out_date is not None:
        updates.append("check_out_date = ?")
        params.append(check_out_date)
    if amenities is not None:
        updates.append("amenities = ?")
        params.append(amenities)
        
    if updates:
        params.append(session_id)
        query = f"UPDATE trip_context SET {', '.join(updates)} WHERE session_id = ?"
        cursor.execute(query, params)
        conn.commit()
        
    conn.close()
    return {"status": "success", "message": "Trip context updated in database"}

def get_trip_context(session_id: str) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT origin, destination, travel_date, budget, adults, return_date, check_out_date, amenities, booking_stage FROM trip_context WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "origin": row["origin"],
            "destination": row["destination"],
            "travel_date": row["travel_date"],
            "budget": row["budget"],
            "adults": row["adults"],
            "return_date": row["return_date"],
            "check_out_date": row["check_out_date"],
            "amenities": row["amenities"],
            "booking_stage": row["booking_stage"]
        }
    return {}

def update_booking_stage(session_id: str, stage: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE trip_context SET booking_stage = ? WHERE session_id = ?",
        (stage, session_id)
    )
    conn.commit()
    conn.close()

# Initialize DB on import
init_db()
