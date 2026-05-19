import json
import psycopg2
from psycopg2.extras import RealDictCursor
from tqdm import tqdm

# PostgreSQL connection
conn = psycopg2.connect(
    host="localhost",
    database="iradlive_v1",
    user="postgres",
    password="root",
    port="5432"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# ---------------------------------------------------------
# Main district-wise summary query
# ---------------------------------------------------------
main_query = """
WITH district_accidents AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        INITCAP(TRIM(district)) AS district_name,
        UPPER(TRIM(state)) AS state_name,

        SUM(
            COALESCE(driver_killed, 0) +
            COALESCE(passenger_killed, 0) +
            COALESCE(pedestrian_killed, 0)
        ) AS total_fatalities,

        SUM(
            COALESCE(driver_grievous_injury, 0) +
            COALESCE(passenger_grievous_injury, 0) +
            COALESCE(pedestrian_grievous_injury, 0)
        ) AS total_grievous

    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
      AND district IS NOT NULL
      AND morth_corridor_id_30m IS NOT NULL
    GROUP BY
        LOWER(TRIM(state)),
        LOWER(TRIM(district)),
        INITCAP(TRIM(district)),
        UPPER(TRIM(state))
),

district_corridors AS (
    WITH corridor_summary AS (
        SELECT
            LOWER(TRIM(state)) AS state_key,
            LOWER(TRIM(district)) AS district_key,
            morth_corridor_id_30m,

            COUNT(*) FILTER (
                WHERE
                    (
                        COALESCE(driver_killed, 0) +
                        COALESCE(passenger_killed, 0) +
                        COALESCE(pedestrian_killed, 0)
                    ) > 0
                    OR
                    (
                        COALESCE(driver_grievous_injury, 0) +
                        COALESCE(passenger_grievous_injury, 0) +
                        COALESCE(pedestrian_grievous_injury, 0)
                    ) > 0
            ) AS fg_accident_count

        FROM accident_nearest_road_details
        WHERE state IS NOT NULL
          AND district IS NOT NULL
          AND morth_corridor_id_30m IS NOT NULL
        GROUP BY
            LOWER(TRIM(state)),
            LOWER(TRIM(district)),
            morth_corridor_id_30m
    )

    SELECT
        cs.state_key,
        cs.district_key,

        COUNT(DISTINCT cs.morth_corridor_id_30m) AS corridors,

        COUNT(DISTINCT CASE
            WHEN mc.is_blackspot = TRUE THEN cs.morth_corridor_id_30m
        END) AS blackspots,

        SUM(cs.fg_accident_count) AS fg_covered

    FROM corridor_summary cs
    LEFT JOIN morth_corridors mc
        ON cs.morth_corridor_id_30m = mc.corridor_name

    GROUP BY
        cs.state_key,
        cs.district_key
)

SELECT
    da.state_key,
    da.district_key,
    da.district_name,
    da.state_name,
    COALESCE(dc.fg_covered, 0) AS fg_covered,
    COALESCE(dc.blackspots, 0) AS blackspots,
    COALESCE(dc.corridors, 0) AS corridors,
    ROUND(COALESCE(da.total_fatalities, 0)) AS total_fatalities,
    ROUND(COALESCE(da.total_grievous, 0)) AS total_grievous,
    ROUND(
        COALESCE(da.total_fatalities, 0) +
        COALESCE(da.total_grievous, 0)
    ) AS total_fg
FROM district_accidents da
LEFT JOIN district_corridors dc
    ON da.state_key = dc.state_key
   AND da.district_key = dc.district_key
ORDER BY da.state_name, da.district_name;
"""

print("Loading district summary...")
cursor.execute(main_query)
district_rows = cursor.fetchall()

result = {
    "district_data_by_state": {}
}



 # ---------------------------------------------------------
# Spot Distribution based on total fatalities per corridor
# ---------------------------------------------------------
# ---------------------------------------------------------
# Preload spot distribution for all districts
# ---------------------------------------------------------
spot_query = """
WITH corridor_fatalities AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        morth_corridor_id_30m,

        SUM(
            COALESCE(driver_killed, 0) +
            COALESCE(passenger_killed, 0) +
            COALESCE(pedestrian_killed, 0)
        ) AS fatalities_count

    FROM accident_nearest_road_details
    WHERE morth_corridor_id_30m IS NOT NULL
      AND state IS NOT NULL
      AND district IS NOT NULL
    GROUP BY
        LOWER(TRIM(state)),
        LOWER(TRIM(district)),
        morth_corridor_id_30m
)
SELECT
    state_key,
    district_key,
    CASE
        WHEN fatalities_count BETWEEN 0 AND 10 THEN '0-10'
        WHEN fatalities_count BETWEEN 11 AND 20 THEN '10-20'
        ELSE '20+'
    END AS label,
    COUNT(*) AS value
FROM corridor_fatalities
GROUP BY
    state_key,
    district_key,
    CASE
        WHEN fatalities_count BETWEEN 0 AND 10 THEN '0-10'
        WHEN fatalities_count BETWEEN 11 AND 20 THEN '10-20'
        ELSE '20+'
    END;
"""

print("Loading spot distribution...")
cursor.execute(spot_query)
all_spots = cursor.fetchall()

# ---------------------------------------------------------
# Top 3 Violations
# ---------------------------------------------------------
# ---------------------------------------------------------
# Preload top violations for all districts
# ---------------------------------------------------------
violations_query = """
WITH grouped AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        COALESCE(NULLIF(TRIM(traffic_violation), ''), 'No Violation') AS name,
        COUNT(*) AS count
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
    AND district IS NOT NULL
    AND morth_corridor_id_30m IS NOT NULL
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct,
        ROW_NUMBER() OVER (
            PARTITION BY state_key, district_key
            ORDER BY count DESC
        ) AS rn
    FROM grouped
)
SELECT *
FROM ranked
WHERE rn <= 3;
"""
print("Loading violations...")
cursor.execute(violations_query)
all_violations = cursor.fetchall()

# ---------------------------------------------------------
# Top 3 Crash Types
# ---------------------------------------------------------
# ---------------------------------------------------------
# Preload top crash types for all districts
# ---------------------------------------------------------
crash_type_query = """
WITH grouped AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        COALESCE(NULLIF(TRIM(collision_type), ''), 'Unknown') AS name,
        COUNT(*) AS count
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
    AND district IS NOT NULL
    AND morth_corridor_id_30m IS NOT NULL
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct,
        ROW_NUMBER() OVER (
            PARTITION BY state_key, district_key
            ORDER BY count DESC
        ) AS rn
    FROM grouped
)
SELECT *
FROM ranked
WHERE rn <= 3;
"""

print("Loading crash types...")
cursor.execute(crash_type_query)
all_crash_types = cursor.fetchall()

# ---------------------------------------------------------
# Top 3 Crash Natures
# ---------------------------------------------------------
# ---------------------------------------------------------
# Preload top crash natures for all districts
# ---------------------------------------------------------
crash_nature_query = """
WITH grouped AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        COALESCE(NULLIF(TRIM(collision_nature), ''), 'Unknown') AS name,
        COUNT(*) AS count
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
    AND district IS NOT NULL
    AND morth_corridor_id_30m IS NOT NULL
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct,
        ROW_NUMBER() OVER (
            PARTITION BY state_key, district_key
            ORDER BY count DESC
        ) AS rn
    FROM grouped
)
SELECT *
FROM ranked
WHERE rn <= 3;
"""

print("Loading crash natures...")
cursor.execute(crash_nature_query)
all_crash_natures = cursor.fetchall()



from collections import defaultdict

spot_lookup = defaultdict(list)
for row in all_spots:
    key = (row["state_key"], row["district_key"])
    spot_lookup[key].append({
        "label": row["label"],
        "value": row["value"]
    })

violation_lookup = defaultdict(list)
for row in all_violations:
    key = (row["state_key"], row["district_key"])
    violation_lookup[key].append({
        "name": row["name"],
        "count": row["count"],
        "pct": float(row["pct"])
    })

crash_type_lookup = defaultdict(list)
for row in all_crash_types:
    key = (row["state_key"], row["district_key"])
    crash_type_lookup[key].append({
        "name": row["name"],
        "count": row["count"],
        "pct": float(row["pct"])
    })

crash_nature_lookup = defaultdict(list)
for row in all_crash_natures:
    key = (row["state_key"], row["district_key"])
    crash_nature_lookup[key].append({
        "name": row["name"],
        "count": row["count"],
        "pct": float(row["pct"])
    })






# ---------------------------------------------------------
# Loop through each district
# ---------------------------------------------------------
for row in tqdm(district_rows, desc="Processing Districts"):
    state_key = row["state_key"]
    district_key = row["district_key"]

    lookup_key = (state_key, district_key)

    spot_distribution = spot_lookup.get(lookup_key, [])
    violations = violation_lookup.get(lookup_key, [])
    crash_types = crash_type_lookup.get(lookup_key, [])
    crash_natures = crash_nature_lookup.get(lookup_key, [])

    if state_key not in result["district_data_by_state"]:
        result["district_data_by_state"][state_key] = {}

   
    # ---------------------------------------------------------
    # Build final district object
    # ---------------------------------------------------------
    district_code = row["district_name"].upper()

    result["district_data_by_state"][state_key][district_code] = {
        "name": f"{district_code} ({row['state_name']})",
        "district_name": row["district_name"],
        "state_name": row["state_name"],
        "fg_covered": int(row["fg_covered"] or 0),
        "blackspots": int(row["blackspots"] or 0),
        "corridors": int(row["corridors"] or 0),
        "total_fatalities": float(row["total_fatalities"] or 0),
        "total_grievous": float(row["total_grievous"] or 0),
        "total_fg": float(row["total_fg"] or 0),
        "spot_distribution": [
            {
                "label": item["label"],
                "value": item["value"]
            }
            for item in spot_distribution
        ],
        "violations": [
            {
                "name": item["name"],
                "count": item["count"],
                "pct": float(item["pct"]) if item["pct"] is not None else 0
            }
            for item in violations
        ],
        "crash_types": [
            {
                "name": item["name"],
                "count": item["count"],
                "pct": float(item["pct"]) if item["pct"] is not None else 0
            }
            for item in crash_types
        ],
        "crash_natures": [
            {
                "name": item["name"],
                "count": item["count"],
                "pct": float(item["pct"]) if item["pct"] is not None else 0
            }
            for item in crash_natures
        ]
    }

# ---------------------------------------------------------
# Save JSON file
# ---------------------------------------------------------
with open("mort-districts-1.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("mort-districts-1.json generated successfully.")

cursor.close()
conn.close()