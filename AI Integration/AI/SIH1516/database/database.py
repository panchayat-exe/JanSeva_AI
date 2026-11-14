import sqlite3
from pathlib import Path


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "complaints.db"


VALID_STATUSES = [
    "SUBMITTED",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED"
]


def get_connection():

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# INITIALIZE DATABASE
# ============================================================

def initialize_database():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            complaint TEXT NOT NULL,

            latitude REAL,
            longitude REAL,

            subcategory TEXT,
            category TEXT,
            department TEXT,

            confidence REAL,
            priority TEXT,

            status TEXT DEFAULT 'SUBMITTED',

            assigned_to TEXT,
            assigned_at TIMESTAMP,

            is_duplicate INTEGER DEFAULT 0,
            duplicate_similarity REAL,
            matched_complaint TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ========================================================
    # MIGRATION FOR OLDER DATABASE
    # ========================================================

    cursor.execute("PRAGMA table_info(complaints)")

    columns = [
        column["name"]
        for column in cursor.fetchall()
    ]

    # Add status if missing
    if "status" not in columns:

        cursor.execute("""
            ALTER TABLE complaints
            ADD COLUMN status TEXT DEFAULT 'SUBMITTED'
        """)

    # Add assigned_to if missing
    if "assigned_to" not in columns:

        cursor.execute("""
            ALTER TABLE complaints
            ADD COLUMN assigned_to TEXT
        """)

    # Add assigned_at if missing
    if "assigned_at" not in columns:

        cursor.execute("""
            ALTER TABLE complaints
            ADD COLUMN assigned_at TIMESTAMP
        """)

        # ========================================================
    # COMPLAINT HISTORY / AUDIT TRAIL
    # ========================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaint_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            complaint_id INTEGER NOT NULL,

            action TEXT NOT NULL,

            status TEXT,

            assigned_to TEXT,

            details TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (complaint_id)
                REFERENCES complaints(id)
        )
    """)

    connection.commit()
    connection.close()


# ============================================================
# GET EXISTING COMPLAINTS
# Used by duplicate detection
# ============================================================

def get_existing_complaints():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            complaint,
            latitude,
            longitude
        FROM complaints
    """)

    rows = cursor.fetchall()

    connection.close()

    complaints = []

    for row in rows:

        complaints.append({
            "text": row["complaint"],
            "latitude": row["latitude"],
            "longitude": row["longitude"]
        })

    return complaints


# ============================================================
# ADD COMPLAINT HISTORY EVENT
# ============================================================

def add_complaint_history(
    complaint_id,
    action,
    status=None,
    assigned_to=None,
    details=None
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO complaint_history (

            complaint_id,
            action,
            status,
            assigned_to,
            details

        )

        VALUES (?, ?, ?, ?, ?)

    """, (

        complaint_id,
        action,
        status,
        assigned_to,
        details

    ))

    connection.commit()
    connection.close()


# ============================================================
# SAVE NEW COMPLAINT
# ============================================================

def save_complaint(
    complaint,
    latitude,
    longitude,
    analysis
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO complaints (

            complaint,
            latitude,
            longitude,

            subcategory,
            category,
            department,

            confidence,
            priority,

            status,

            is_duplicate,
            duplicate_similarity,
            matched_complaint

        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    """, (

        complaint,
        latitude,
        longitude,

        analysis["subcategory"],
        analysis["category"],
        analysis["department"],

        analysis["confidence"],
        analysis["priority"],

        "SUBMITTED",

        int(analysis["is_duplicate"]),
        analysis["duplicate_similarity"],
        analysis["matched_complaint"]

    ))

    complaint_id = cursor.lastrowid

    connection.commit()
    connection.close()

    # Record complaint creation in history
    add_complaint_history(
        complaint_id=complaint_id,
        action="SUBMITTED",
        status="SUBMITTED",
        details="Complaint submitted"
    )

    return complaint_id


# ============================================================
# GET ALL COMPLAINTS
# Supports dashboard filtering
# ============================================================

def get_all_complaints(
    status=None,
    priority=None,
    department=None
):

    connection = get_connection()
    cursor = connection.cursor()

    query = """
        SELECT *
        FROM complaints
        WHERE 1=1
    """

    parameters = []

    if status:

        query += " AND status = ?"
        parameters.append(status.upper())

    if priority:

        query += " AND priority = ?"
        parameters.append(priority.upper())

    if department:

        query += " AND department = ?"
        parameters.append(department)

    # Critical complaints first
    query += """
        ORDER BY

            CASE priority

                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4

                ELSE 5

            END,

            id DESC
    """

    cursor.execute(
        query,
        parameters
    )

    rows = cursor.fetchall()

    connection.close()

    return [
        dict(row)
        for row in rows
    ]


# ============================================================
# GET ONE COMPLAINT
# ============================================================

def get_complaint_by_id(
    complaint_id
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM complaints
        WHERE id = ?
    """, (
        complaint_id,
    ))

    row = cursor.fetchone()

    connection.close()

    if row is None:
        return None

    return dict(row)


# ============================================================
# UPDATE COMPLAINT STATUS
# ============================================================

def update_complaint_status(
    complaint_id,
    new_status
):

    new_status = new_status.upper()

    if new_status not in VALID_STATUSES:
        return False

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE complaints
        SET status = ?
        WHERE id = ?
    """, (
        new_status,
        complaint_id
    ))

    updated = cursor.rowcount > 0

    connection.commit()
    connection.close()

    if updated:

        add_complaint_history(
            complaint_id=complaint_id,
            action="STATUS_CHANGED",
            status=new_status,
            details=f"Complaint status changed to {new_status}"
        )

    return updated


# ============================================================
# ASSIGN COMPLAINT TO OFFICER / TEAM
# ============================================================

def assign_complaint(
    complaint_id,
    assigned_to
):

    if not assigned_to:
        return False

    assigned_to = assigned_to.strip()

    if not assigned_to:
        return False

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE complaints

        SET
            assigned_to = ?,
            assigned_at = CURRENT_TIMESTAMP,
            status = 'ASSIGNED'

        WHERE id = ?
    """, (
        assigned_to,
        complaint_id
    ))

    updated = cursor.rowcount > 0

    connection.commit()
    connection.close()

    if updated:

        add_complaint_history(
            complaint_id=complaint_id,
            action="ASSIGNED",
            status="ASSIGNED",
            assigned_to=assigned_to,
            details=f"Complaint assigned to {assigned_to}"
        )

    return updated

# ============================================================
# GET COMPLAINT HISTORY
# ============================================================

def get_complaint_history(
    complaint_id
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            complaint_id,
            action,
            status,
            assigned_to,
            details,
            created_at

        FROM complaint_history

        WHERE complaint_id = ?

        ORDER BY id ASC

    """, (
        complaint_id,
    ))

    rows = cursor.fetchall()

    connection.close()

    return [
        dict(row)
        for row in rows
    ]


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

def get_dashboard_stats():

    connection = get_connection()
    cursor = connection.cursor()

    # ========================================================
    # TOTAL COMPLAINTS
    # ========================================================

    cursor.execute("""
        SELECT COUNT(*)
        FROM complaints
    """)

    total = cursor.fetchone()[0]


    # ========================================================
    # STATUS COUNTS
    # ========================================================

    cursor.execute("""
        SELECT
            status,
            COUNT(*) AS count

        FROM complaints

        GROUP BY status
    """)

    status_rows = cursor.fetchall()

    status_counts = {

        "SUBMITTED": 0,
        "ASSIGNED": 0,
        "IN_PROGRESS": 0,
        "RESOLVED": 0

    }

    for row in status_rows:

        status = row["status"]
        count = row["count"]

        if status:

            status_counts[
                status.upper()
            ] = count


    # ========================================================
    # PRIORITY COUNTS
    # ========================================================

    cursor.execute("""
        SELECT
            priority,
            COUNT(*) AS count

        FROM complaints

        GROUP BY priority
    """)

    priority_rows = cursor.fetchall()

    priority_counts = {

        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0

    }

    for row in priority_rows:

        priority = row["priority"]
        count = row["count"]

        if priority:

            priority_counts[
                priority.upper()
            ] = count


    connection.close()


    # ========================================================
    # FINAL DASHBOARD RESPONSE
    # ========================================================

    return {

        "total_complaints":
            total,

        # Status statistics

        "submitted":
            status_counts["SUBMITTED"],

        "assigned":
            status_counts["ASSIGNED"],

        "in_progress":
            status_counts["IN_PROGRESS"],

        "resolved":
            status_counts["RESOLVED"],


        # Priority statistics

        "critical":
            priority_counts["CRITICAL"],

        "high":
            priority_counts["HIGH"],

        "medium":
            priority_counts["MEDIUM"],

        "low":
            priority_counts["LOW"]

    }


# ============================================================
# TEST DATABASE
# ============================================================

if __name__ == "__main__":

    initialize_database()

    complaints = get_all_complaints()

    stats = get_dashboard_stats()

    print(
        "Database connected successfully!"
    )

    print(
        "Database location:",
        DB_PATH
    )

    print(
        "Existing complaints:",
        len(complaints)
    )

    print(
        "Dashboard stats:",
        stats
    )