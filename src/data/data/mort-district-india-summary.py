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
    LOWER(TRIM(district)) AS district_key,

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
  AND district IS NOT NULL
  AND TRIM(district) <> ''
GROUP BY
    LOWER(TRIM(state)),
    LOWER(TRIM(district))
ORDER BY
    LOWER(TRIM(state)),
    LOWER(TRIM(district));
"""

print("Loading district india summary...")
cursor.execute(india_summary_query)
rows = cursor.fetchall()

result = {
    "states": {}
}

for row in tqdm(rows):
    state_key = row["state_key"]
    district_key = row["district_key"]

    if state_key not in result["states"]:
        result["states"][state_key] = {
            "districts": {}
        }

    result["states"][state_key]["districts"][district_key] = {
        "total_accidents_india_three_years": int(row["total_accidents_india_three_years"] or 0),
        "total_fatal_accidents_india_three_years": int(row["total_fatal_accidents_india_three_years"] or 0),
        "total_grievous_accidents_india_three_years": int(row["total_grievous_accidents_india_three_years"] or 0)
    }

with open("mort-district-india-summary.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("mort-district-india-summary.json generated successfully.")

cursor.close()
conn.close()