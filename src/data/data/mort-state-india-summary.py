import json
import psycopg2
from psycopg2.extras import RealDictCursor
from tqdm import tqdm

conn = psycopg2.connect(
    host="localhost",
    database="iradlive_v1",
    user="postgres",
    password="root",
    port="5432"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

india_summary_query = """
SELECT
    LOWER(TRIM(state)) AS state_key,

    COUNT(*) FILTER (
        WHERE to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date >= DATE '2023-01-01'
        AND to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date < DATE '2023-01-01' + INTERVAL '3 years'
    ) AS total_accidents_india_three_years,

    COUNT(*) FILTER (
        WHERE to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date >= DATE '2023-01-01'
        AND to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date < DATE '2023-01-01' + INTERVAL '3 years'
        AND (
            COALESCE(driver_killed, 0) > 0 OR
            COALESCE(passenger_killed, 0) > 0 OR
            COALESCE(pedestrian_killed, 0) > 0
        )
    ) AS total_fatal_accidents_india_three_years,

    COUNT(*) FILTER (
        WHERE to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date >= DATE '2023-01-01'
        AND to_timestamp(
            accident_date_time,
            'DD-Mon-YYYY : HH24:MI'
        )::date < DATE '2023-01-01' + INTERVAL '3 years'
        AND (
            COALESCE(driver_grievous_injury, 0) > 0 OR
            COALESCE(passenger_grievous_injury, 0) > 0 OR
            COALESCE(pedestrian_grievous_injury, 0) > 0
        )
        AND COALESCE(driver_killed, 0) = 0
        AND COALESCE(passenger_killed, 0) = 0
        AND COALESCE(pedestrian_killed, 0) = 0
    ) AS total_grievous_accidents_india_three_years

FROM accident_nearest_road_details
WHERE state IS NOT NULL
  AND TRIM(state) <> ''
GROUP BY
    LOWER(TRIM(state))
ORDER BY
    LOWER(TRIM(state));
"""

print("Loading state india summary...")
cursor.execute(india_summary_query)
rows = cursor.fetchall()

result = {
    "states": {}
}

for row in tqdm(rows):
    state_key = row["state_key"]

    result["states"][state_key] = {
        "total_accidents_india_three_years": int(row["total_accidents_india_three_years"] or 0),
        "total_fatal_accidents_india_three_years": int(row["total_fatal_accidents_india_three_years"] or 0),
        "total_grievous_accidents_india_three_years": int(row["total_grievous_accidents_india_three_years"] or 0)
    }

with open("mort-state-india-summary.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("mort-state-india-summary.json generated successfully.")

cursor.close()
conn.close()