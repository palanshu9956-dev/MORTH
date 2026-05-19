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

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(driver_killed, 0) > 0 OR
                    COALESCE(passenger_killed, 0) > 0 OR
                    COALESCE(pedestrian_killed, 0) > 0
                )
        ) AS total_fatal_accidents,

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(driver_grievous_injury, 0) > 0 OR
                    COALESCE(passenger_grievous_injury, 0) > 0 OR
                    COALESCE(pedestrian_grievous_injury, 0) > 0
                )
                AND COALESCE(driver_killed, 0) = 0
                AND COALESCE(passenger_killed, 0) = 0
                AND COALESCE(pedestrian_killed, 0) = 0
        ) AS total_grievous_accidents,

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
      AND TRIM(morth_corridor_id_30m) <> ''
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
          AND TRIM(morth_corridor_id_30m) <> ''
        GROUP BY
            LOWER(TRIM(state)),
            LOWER(TRIM(district)),
            morth_corridor_id_30m
    )

    SELECT
        cs.state_key,
        cs.district_key,

        COUNT(DISTINCT cs.morth_corridor_id_30m) AS corridors,
        ROUND(COALESCE(SUM(mc.length_in_meters), 0) / 1000.0, 1) AS total_length_processed,


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
    COALESCE(dc.total_length_processed, 0) AS total_length_processed,
    COALESCE(da.total_fatal_accidents, 0) AS total_fatal_accidents,
    COALESCE(da.total_grievous_accidents, 0) AS total_grievous_accidents,
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
# Top 3 Violations
# ---------------------------------------------------------
# ---------------------------------------------------------
# Preload top violations for all districts
# ---------------------------------------------------------
violations_query = """
WITH expanded AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        TRIM(
            UNNEST(
                STRING_TO_ARRAY(
                    COALESCE(NULLIF(TRIM(traffic_violation), ''), 'Unknown/Missing'),
                    ','
                )
            )
        ) AS name
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
      AND district IS NOT NULL
      AND morth_corridor_id_30m IS NOT NULL
      AND TRIM(morth_corridor_id_30m) <> ''
),
grouped AS (
    SELECT
        state_key,
        district_key,
        name,
        COUNT(*) AS count
    FROM expanded
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct
    FROM grouped
)
SELECT *
FROM ranked
ORDER BY state_key, district_key, count DESC;
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
WITH expanded AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        TRIM(
            UNNEST(
                STRING_TO_ARRAY(
                    COALESCE(NULLIF(TRIM(collision_type), ''), 'Unknown/Missing'),
                    ','
                )
            )
        ) AS name
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
      AND district IS NOT NULL
      AND morth_corridor_id_30m IS NOT NULL
      AND TRIM(morth_corridor_id_30m) <> ''
),
grouped AS (
    SELECT
        state_key,
        district_key,
        name,
        COUNT(*) AS count
    FROM expanded
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct
    FROM grouped
)
SELECT *
FROM ranked
ORDER BY state_key, district_key, count DESC;
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
WITH expanded AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        TRIM(
            UNNEST(
                STRING_TO_ARRAY(
                    COALESCE(NULLIF(TRIM(collision_nature), ''), 'Unknown/Missing'),
                    ','
                )
            )
        ) AS name
    FROM accident_nearest_road_details
    WHERE state IS NOT NULL
      AND district IS NOT NULL
      AND morth_corridor_id_30m IS NOT NULL
      AND TRIM(morth_corridor_id_30m) <> ''
),
grouped AS (
    SELECT
        state_key,
        district_key,
        name,
        COUNT(*) AS count
    FROM expanded
    GROUP BY 1,2,3
),
ranked AS (
    SELECT *,
        ROUND(
            count * 100.0 /
            SUM(count) OVER (PARTITION BY state_key, district_key),
            1
        ) AS pct
    FROM grouped
)
SELECT *
FROM ranked
ORDER BY state_key, district_key, count DESC;
"""

print("Loading crash natures...")
cursor.execute(crash_nature_query)
all_crash_natures = cursor.fetchall()

top_corridors_query = """
WITH corridor_stats AS (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        LOWER(TRIM(district)) AS district_key,
        morth_corridor_id_30m AS corridor_name,

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(driver_killed, 0) > 0 OR
                    COALESCE(passenger_killed, 0) > 0 OR
                    COALESCE(pedestrian_killed, 0) > 0
                )
        ) AS total_fatal_accidents,

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(driver_grievous_injury, 0) > 0 OR
                    COALESCE(passenger_grievous_injury, 0) > 0 OR
                    COALESCE(pedestrian_grievous_injury, 0) > 0
                )
                AND COALESCE(driver_killed, 0) = 0
                AND COALESCE(passenger_killed, 0) = 0
                AND COALESCE(pedestrian_killed, 0) = 0
        ) AS total_grievous_accidents,

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
      AND TRIM(morth_corridor_id_30m) <> ''
    GROUP BY
        LOWER(TRIM(state)),
        LOWER(TRIM(district)),
        morth_corridor_id_30m
),

ranked AS (
    SELECT
        cs.state_key,
        cs.district_key,
        cs.corridor_name,
        mc.length_in_meters,

        COALESCE(cs.total_fatal_accidents, 0) AS total_fatal_accidents,
        COALESCE(cs.total_grievous_accidents, 0) AS total_grievous_accidents,
        COALESCE(cs.total_fatalities, 0) AS total_fatalities,
        (
            COALESCE(cs.total_fatal_accidents, 0) +
            COALESCE(cs.total_grievous_accidents, 0)
        ) AS total_fatal_grievous_accidents,

        ROW_NUMBER() OVER (
            PARTITION BY cs.state_key, cs.district_key
            ORDER BY
                (
                    COALESCE(cs.total_fatal_accidents, 0) +
                    COALESCE(cs.total_grievous_accidents, 0)
                ) DESC,
                COALESCE(cs.total_fatal_accidents, 0) DESC,
                COALESCE(cs.total_fatalities, 0) DESC
        ) AS rn

    FROM corridor_stats cs
    LEFT JOIN (
        SELECT DISTINCT
            corridor_name,
            length_in_meters
        FROM morth_corridors
    ) mc
        ON cs.corridor_name = mc.corridor_name
)

SELECT *
FROM ranked
WHERE rn <= 20
ORDER BY state_key, district_key, rn;
"""

print("Loading top corridors...")
cursor.execute(top_corridors_query)
all_top_corridors = cursor.fetchall()



agency_query = """
WITH agency_accidents AS (
    SELECT
        LOWER(TRIM(a.state)) AS state_key,
        LOWER(TRIM(a.district)) AS district_key,
        TRIM(mc.jurisdiction) AS agency_name,

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(a.driver_killed, 0) > 0 OR
                    COALESCE(a.passenger_killed, 0) > 0 OR
                    COALESCE(a.pedestrian_killed, 0) > 0
                )
        ) AS total_fatal_accidents,

        COUNT(*) FILTER (
            WHERE
                (
                    COALESCE(a.driver_grievous_injury, 0) > 0 OR
                    COALESCE(a.passenger_grievous_injury, 0) > 0 OR
                    COALESCE(a.pedestrian_grievous_injury, 0) > 0
                )
                AND COALESCE(a.driver_killed, 0) = 0
                AND COALESCE(a.passenger_killed, 0) = 0
                AND COALESCE(a.pedestrian_killed, 0) = 0
        ) AS total_grievous_accidents,

        SUM(
            COALESCE(a.driver_killed, 0) +
            COALESCE(a.passenger_killed, 0) +
            COALESCE(a.pedestrian_killed, 0)
        ) AS fatalities

    FROM accident_nearest_road_details a
    LEFT JOIN morth_corridors mc
        ON a.morth_corridor_id_30m = mc.corridor_name

    WHERE a.state IS NOT NULL
      AND a.district IS NOT NULL
      AND a.morth_corridor_id_30m IS NOT NULL
      AND TRIM(morth_corridor_id_30m) <> ''
      AND mc.jurisdiction IS NOT NULL
      AND TRIM(mc.jurisdiction) <> ''

    GROUP BY
        LOWER(TRIM(a.state)),
        LOWER(TRIM(a.district)),
        TRIM(mc.jurisdiction)
),

agency_corridors AS (
    SELECT
        LOWER(TRIM(mc.states)) AS state_key,
        a.district_key AS district_key,
        TRIM(mc.jurisdiction) AS agency_name,

        ROUND(COALESCE(SUM(mc.length_in_meters), 0) / 1000.0, 1) AS length_km,
        COUNT(DISTINCT mc.corridor_name) AS corridors

    FROM morth_corridors mc
    INNER JOIN (
        SELECT DISTINCT
            LOWER(TRIM(state)) AS state_key,
            LOWER(TRIM(district)) AS district_key,
            morth_corridor_id_30m
        FROM accident_nearest_road_details
        WHERE morth_corridor_id_30m IS NOT NULL
        AND TRIM(morth_corridor_id_30m) <> ''
    ) a
        ON mc.corridor_name = a.morth_corridor_id_30m
       AND LOWER(TRIM(mc.states)) = a.state_key

    WHERE SPLIT_PART(mc.corridor_name, '__', 2) = '30m'
        AND mc.jurisdiction IS NOT NULL
        AND TRIM(mc.jurisdiction) <> ''

    GROUP BY
        LOWER(TRIM(mc.states)),
        a.district_key,
        TRIM(mc.jurisdiction)
)

SELECT
    aa.state_key,
    aa.district_key,
    aa.agency_name,
    COALESCE(ac.length_km, 0) AS length_km,
    COALESCE(ac.corridors, 0) AS corridors,
    (
        COALESCE(aa.total_fatal_accidents, 0) +
        COALESCE(aa.total_grievous_accidents, 0)
    ) AS accidents,
    COALESCE(aa.fatalities, 0) AS fatalities
FROM agency_accidents aa
LEFT JOIN agency_corridors ac
    ON aa.state_key = ac.state_key
   AND aa.district_key = ac.district_key
   AND aa.agency_name = ac.agency_name
ORDER BY
    aa.state_key,
    aa.district_key,
    accidents DESC;
"""

print("Loading agencies...")
cursor.execute(agency_query)
all_agencies = cursor.fetchall()


from collections import defaultdict


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

top_corridors_lookup = defaultdict(list)

for row in all_top_corridors:
    key = (row["state_key"], row["district_key"])

    top_corridors_lookup[key].append({
        "rank": int(row["rn"]),
        "corridor_name": row["corridor_name"],
        "road_name": row["corridor_name"].split("__")[0] if row["corridor_name"] else "",
        "district": row["district_key"].replace("_", " ").title() if row["district_key"] else "",
        "length_km": round(float(row["length_in_meters"] or 0) / 1000.0, 2),
        "fatalities": int(row["total_fatalities"] or 0),
        "fatal_grievous_accidents": int(row["total_fatal_grievous_accidents"] or 0)
    })

agency_lookup = defaultdict(list)

for row in all_agencies:
    key = (row["state_key"], row["district_key"])

    agency_lookup[key].append({
        "name": row["agency_name"],
        "length": float(row["length_km"] or 0),
        "corridors": int(row["corridors"] or 0),
        "accidents": int(row["accidents"] or 0),
        "fatalities": int(row["fatalities"] or 0)
    })

# ---------------------------------------------------------
# Loop through each district
# ---------------------------------------------------------
for row in tqdm(district_rows, desc="Processing Districts"):
    state_key = row["state_key"]
    district_key = row["district_key"]

    lookup_key = (state_key, district_key)

    violations = violation_lookup.get(lookup_key, [])
    crash_types = crash_type_lookup.get(lookup_key, [])
    crash_natures = crash_nature_lookup.get(lookup_key, [])
    top_corridors = top_corridors_lookup.get(lookup_key, [])
    agencies = agency_lookup.get(lookup_key, [])

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
        "total_length_processed": float(row["total_length_processed"] or 0),
        "total_fatal_accidents": int(row["total_fatal_accidents"] or 0),
        "total_grievous_accidents": int(row["total_grievous_accidents"] or 0),
        "corridors": int(row["corridors"] or 0),
        "total_fatalities": float(row["total_fatalities"] or 0),
        "total_grievous": float(row["total_grievous"] or 0),
        "total_fg": float(row["total_fg"] or 0),
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
        ],
        "top_corridors": top_corridors,
        "agencies": agencies,
    }

# ---------------------------------------------------------
# Save JSON file
# ---------------------------------------------------------
with open("mort-districts-1.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("mort-districts-1.json generated successfully.")

cursor.close()
conn.close()