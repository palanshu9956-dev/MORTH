import json
import psycopg2
from psycopg2.extras import RealDictCursor
from collections import defaultdict
from tqdm import tqdm

conn = psycopg2.connect(
    host="localhost",
    database="iradlive_v1",
    user="postgres",
    password="root",
    port="5432"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

result = {
    "default": [],
    "states": {}
}

# ---------------------------------------------------------
# 1. Crashes per Corridor / Spot
# ---------------------------------------------------------
crashes_per_corridor_query = """
WITH corridor_30m AS (
    SELECT *
    FROM morth_corridors
    WHERE SPLIT_PART(corridor_name, '__', 2) = '30m'
)
SELECT
    state_key,
    label,
    value
FROM (
    SELECT
        LOWER(TRIM(states)) AS state_key,
        CASE
            WHEN total_accidents_count BETWEEN 1 AND 10 THEN '1-10'
            WHEN total_accidents_count BETWEEN 11 AND 20 THEN '11-20'
            ELSE '21+'
        END AS label,
        CASE
            WHEN total_accidents_count BETWEEN 1 AND 10 THEN 1
            WHEN total_accidents_count BETWEEN 11 AND 20 THEN 2
            ELSE 3
        END AS sort_order,
        COUNT(*) AS value
    FROM corridor_30m
    WHERE states IS NOT NULL
      AND TRIM(states) <> ''
    GROUP BY
        LOWER(TRIM(states)),
        label,
        sort_order
) t
ORDER BY state_key, sort_order;
"""

# ---------------------------------------------------------
# 2. Fatalities per Corridor / Spot
# ---------------------------------------------------------
fatalities_per_corridor_query = """
WITH corridor_30m AS (
    SELECT *
    FROM morth_corridors
    WHERE SPLIT_PART(corridor_name, '__', 2) = '30m'
)
SELECT
    state_key,
    label,
    value
FROM (
    SELECT
        LOWER(TRIM(states)) AS state_key,
        CASE
            WHEN total_fatalities BETWEEN 0 AND 5 THEN '0-5'
            WHEN total_fatalities BETWEEN 6 AND 15 THEN '6-15'
            ELSE '16+'
        END AS label,
        CASE
            WHEN total_fatalities BETWEEN 0 AND 5 THEN 1
            WHEN total_fatalities BETWEEN 6 AND 15 THEN 2
            ELSE 3
        END AS sort_order,
        COUNT(*) AS value
    FROM corridor_30m
    WHERE states IS NOT NULL
      AND TRIM(states) <> ''
    GROUP BY
        LOWER(TRIM(states)),
        label,
        sort_order
) t
ORDER BY state_key, sort_order;
"""

crashes_by_time_query = """
SELECT
    state_key,
    label,
    value
FROM (
    SELECT
        LOWER(TRIM(state)) AS state_key,
        CASE
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 5
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 10
                THEN 'Morning 5 am-10 am'

            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 10
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 16
                THEN 'Afternoon 10 am-4 pm'

            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 16
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 20
                THEN 'Evening 4 pm-8 pm'

            ELSE 'Night 8 pm-5 am'
        END AS label,

        CASE
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 5
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 10
                THEN 1
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 10
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 16
                THEN 2
            WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 16
                AND EXTRACT(HOUR FROM TO_TIMESTAMP(accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 20
                THEN 3
            ELSE 4
        END AS sort_order,

        COUNT(*) AS value
    FROM accident_nearest_road_details
    WHERE morth_corridor_id_30m IS NOT NULL
      AND TRIM(morth_corridor_id_30m) <> ''
      AND accident_date_time IS NOT NULL
      AND TRIM(accident_date_time) <> ''
      AND state IS NOT NULL
      AND TRIM(state) <> ''
    GROUP BY
        LOWER(TRIM(state)),
        label,
        sort_order
) t
ORDER BY state_key, sort_order;
"""

# ---------------------------------------------------------
# 4. Crashes by Junction Type
# ---------------------------------------------------------
junction_query = """
SELECT
    LOWER(TRIM(a.state)) AS state_key,
    TRIM(r.junction_type) AS label,
    COUNT(*) AS value
FROM accident_nearest_road_details a
LEFT JOIN road_details r
    ON a.accident_id = r.accident_id
WHERE a.morth_corridor_id_30m IS NOT NULL
  AND TRIM(a.morth_corridor_id_30m) <> ''
  AND a.state IS NOT NULL
  AND TRIM(a.state) <> ''
  AND r.junction_type IS NOT NULL
  AND TRIM(r.junction_type) <> ''
GROUP BY
    LOWER(TRIM(a.state)),
    TRIM(r.junction_type)
ORDER BY state_key, value DESC;
"""

# ---------------------------------------------------------
# 5. Crashes by Vehicle Pair
# ---------------------------------------------------------
vehicle_pair_query = """
WITH vehicle_pairs AS (
    SELECT
        accident_id,
        STRING_AGG(
            DISTINCT TRIM(vehicle_type),
            ' + '
            ORDER BY TRIM(vehicle_type)
        ) AS vehicle_pair
    FROM veh_driver_details
    WHERE vehicle_type IS NOT NULL
      AND TRIM(vehicle_type) <> ''
      AND accident_id IS NOT NULL
    GROUP BY accident_id
)
SELECT
    LOWER(TRIM(a.state)) AS state_key,
    vp.vehicle_pair AS label,
    COUNT(*) AS value
FROM accident_nearest_road_details a
JOIN vehicle_pairs vp
    ON a.accident_id = vp.accident_id
WHERE a.morth_corridor_id_30m IS NOT NULL
  AND TRIM(a.morth_corridor_id_30m) <> ''
  AND a.state IS NOT NULL
  AND TRIM(a.state) <> ''
  AND vp.vehicle_pair LIKE '%+%'
GROUP BY
    LOWER(TRIM(a.state)),
    vp.vehicle_pair
ORDER BY state_key, value DESC;
"""

crashes_by_year_query = """
WITH corridor_30m AS (
    SELECT *
    FROM morth_corridors
    WHERE SPLIT_PART(corridor_name, '__', 2) = '30m'
)
SELECT state_key, year_label AS label, value
FROM (
    SELECT
        LOWER(TRIM(states)) AS state_key,
        '2023' AS year_label,
        COALESCE(SUM(fatal_grevious_accidents_count_2023), 0) AS value
    FROM corridor_30m
    WHERE states IS NOT NULL
      AND TRIM(states) <> ''
    GROUP BY LOWER(TRIM(states))

    UNION ALL

    SELECT
        LOWER(TRIM(states)) AS state_key,
        '2024' AS year_label,
        COALESCE(SUM(fatal_grevious_accidents_count_2024), 0) AS value
    FROM corridor_30m
    WHERE states IS NOT NULL
      AND TRIM(states) <> ''
    GROUP BY LOWER(TRIM(states))

    UNION ALL

    SELECT
        LOWER(TRIM(states)) AS state_key,
        '2025' AS year_label,
        COALESCE(SUM(fatal_grevious_accidents_count_2025), 0) AS value
    FROM corridor_30m
    WHERE states IS NOT NULL
      AND TRIM(states) <> ''
    GROUP BY LOWER(TRIM(states))
) t
ORDER BY state_key, value DESC;
"""

pedestrian_accident_vehicle_query = """
SELECT
    LOWER(TRIM(a.state)) AS state_key,
    TRIM(v.vehicle_type) AS label,
    COUNT(DISTINCT a.accident_id) AS value
FROM accident_nearest_road_details a
JOIN veh_driver_details v
    ON a.accident_id = v.accident_id
WHERE a.morth_corridor_id_30m IS NOT NULL
  AND TRIM(a.morth_corridor_id_30m) <> ''
  AND a.collision_type ILIKE '%Pedestrian%'
  AND a.state IS NOT NULL
  AND TRIM(a.state) <> ''
  AND v.vehicle_type IS NOT NULL
  AND TRIM(v.vehicle_type) <> ''
GROUP BY
    LOWER(TRIM(a.state)),
    TRIM(v.vehicle_type)
ORDER BY state_key, value DESC;
"""

pedestrian_fatality_vehicle_query = """
SELECT
    LOWER(TRIM(a.state)) AS state_key,
    TRIM(v.vehicle_type) AS label,
    SUM(COALESCE(a.pedestrian_killed, 0)) AS value
FROM accident_nearest_road_details a
JOIN veh_driver_details v
    ON a.accident_id = v.accident_id
WHERE a.morth_corridor_id_30m IS NOT NULL
  AND TRIM(a.morth_corridor_id_30m) <> ''
  AND a.collision_type ILIKE '%Pedestrian%'
  AND a.state IS NOT NULL
  AND TRIM(a.state) <> ''
  AND v.vehicle_type IS NOT NULL
  AND TRIM(v.vehicle_type) <> ''
GROUP BY
    LOWER(TRIM(a.state)),
    TRIM(v.vehicle_type)
ORDER BY state_key, value DESC;
"""

print("Loading crashes per corridor...")
cursor.execute(crashes_per_corridor_query)
crashes_per_corridor = cursor.fetchall()

print("Loading fatalities per corridor...")
cursor.execute(fatalities_per_corridor_query)
fatalities_per_corridor = cursor.fetchall()

print("Loading crashes by time...")
cursor.execute(crashes_by_time_query)
crashes_by_time = cursor.fetchall()

print("Loading junction types...")
cursor.execute(junction_query)
junction_types = cursor.fetchall()

print("Loading vehicle pairs...")
cursor.execute(vehicle_pair_query)
vehicle_pairs = cursor.fetchall()

print("Loading crashes by year...")
cursor.execute(crashes_by_year_query)
crashes_by_year = cursor.fetchall()

print("Loading pedestrian accident vehicle types...")
cursor.execute(pedestrian_accident_vehicle_query)
pedestrian_accident_vehicle = cursor.fetchall()

print("Loading pedestrian fatality vehicle types...")
cursor.execute(pedestrian_fatality_vehicle_query)
pedestrian_fatality_vehicle = cursor.fetchall()

# ---------------------------------------------------------
# Create lookup dictionaries
# ---------------------------------------------------------
crash_corridor_lookup = defaultdict(list)
for row in crashes_per_corridor:
    crash_corridor_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

fatality_corridor_lookup = defaultdict(list)
for row in fatalities_per_corridor:
    fatality_corridor_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

time_lookup = defaultdict(list)
for row in crashes_by_time:
    time_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

junction_lookup = defaultdict(list)
for row in junction_types:
    junction_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

vehicle_lookup = defaultdict(list)
for row in vehicle_pairs:
    vehicle_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })


year_lookup = defaultdict(list)
for row in crashes_by_year:
    year_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

pedestrian_accident_lookup = defaultdict(list)
for row in pedestrian_accident_vehicle:
    pedestrian_accident_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })

pedestrian_fatality_lookup = defaultdict(list)
for row in pedestrian_fatality_vehicle:
    pedestrian_fatality_lookup[row["state_key"]].append({
        "label": row["label"],
        "value": int(row["value"])
    })
# ---------------------------------------------------------
# Get all states
# ---------------------------------------------------------
cursor.execute("""
SELECT DISTINCT
    LOWER(TRIM(states)) AS state_key
FROM morth_corridors
WHERE SPLIT_PART(corridor_name, '__', 2) = '30m'
  AND states IS NOT NULL
  AND TRIM(states) <> ''
ORDER BY state_key
""")

states = cursor.fetchall()

print("Building final JSON...")

for row in tqdm(states):
    state_key = row["state_key"]

    result["states"][state_key] = [
        {
            "title": "Crashes per Corridor",
            "rows": crash_corridor_lookup.get(state_key, [])
        },
        {
            "title": "Crashes by Year",
            "rows": year_lookup.get(state_key, [])
        },
        {
            "title": "Fatalities per Corridor",
            "rows": fatality_corridor_lookup.get(state_key, [])
        },
        {
            "title": "Crashes by Time",
            "rows": time_lookup.get(state_key, [])
        },
        {
            "title": "Crashes by Junction Type",
            "rows": junction_lookup.get(state_key, [])
        },
        {
            "title": "Crashes by Vehicle Pair",
            "rows": vehicle_lookup.get(state_key, [])
        },
        {
            "title": "Pedestrian Accidents Involvement by Vehicle Type",
            "rows": pedestrian_accident_lookup.get(state_key, [])
        },
        {
            "title": "Pedestrian Fatalities by Vehicle Type",
            "rows": pedestrian_fatality_lookup.get(state_key, [])
        }
    ]

# ---------------------------------------------------------
# Build default section
# ---------------------------------------------------------
all_crash_corridor = defaultdict(int)
all_fatality_corridor = defaultdict(int)
all_time = defaultdict(int)
all_junction = defaultdict(int)
all_vehicle = defaultdict(int)
all_years = defaultdict(int)
all_pedestrian_accident = defaultdict(int)
all_pedestrian_fatality = defaultdict(int)


for rows in crash_corridor_lookup.values():
    for item in rows:
        all_crash_corridor[item["label"]] += item["value"]

for rows in fatality_corridor_lookup.values():
    for item in rows:
        all_fatality_corridor[item["label"]] += item["value"]

for rows in time_lookup.values():
    for item in rows:
        all_time[item["label"]] += item["value"]

for rows in junction_lookup.values():
    for item in rows:
        all_junction[item["label"]] += item["value"]

for rows in vehicle_lookup.values():
    for item in rows:
        all_vehicle[item["label"]] += item["value"]

for rows in year_lookup.values():
    for item in rows:
        all_years[item["label"]] += item["value"]

for rows in pedestrian_accident_lookup.values():
    for item in rows:
        all_pedestrian_accident[item["label"]] += item["value"]

for rows in pedestrian_fatality_lookup.values():
    for item in rows:
        all_pedestrian_fatality[item["label"]] += item["value"]

result["default"] = [
    {
        "title": "Crashes per Corridor",
        "rows": [
            {"label": "1-10", "value": all_crash_corridor.get("1-10", 0)},
            {"label": "11-20", "value": all_crash_corridor.get("11-20", 0)},
            {"label": "21+", "value": all_crash_corridor.get("21+", 0)}
        ]
    },
    {
    "title": "Crashes by Year",
        "rows": [
            {"label": "2023", "value": all_years.get("2023", 0)},
            {"label": "2024", "value": all_years.get("2024", 0)},
            {"label": "2025", "value": all_years.get("2025", 0)}
        ]
    },
    {
        "title": "Fatalities per Corridor",
        "rows": [
            {"label": "0-5", "value": all_fatality_corridor.get("0-5", 0)},
            {"label": "6-15", "value": all_fatality_corridor.get("6-15", 0)},
            {"label": "16+", "value": all_fatality_corridor.get("16+", 0)}
        ]
    },
    {
        "title": "Crashes by Time",
        "rows": [
            {"label": "Morning 5 am-10 am", "value": all_time.get("Morning 5 am-10 am", 0)},
            {"label": "Afternoon 10 am-4 pm", "value": all_time.get("Afternoon 10 am-4 pm", 0)},
            {"label": "Evening 4 pm-8 pm", "value": all_time.get("Evening 4 pm-8 pm", 0)},
            {"label": "Night 8 pm-5 am", "value": all_time.get("Night 8 pm-5 am", 0)}
        ]
    },
    {
        "title": "Crashes by Junction Type",
        "rows": sorted(
            [{"label": k, "value": v} for k, v in all_junction.items()],
            key=lambda x: x["value"],
            reverse=True
        )
    },
    {
        "title": "Crashes by Vehicle Pair",
        "rows": sorted(
            [{"label": k, "value": v} for k, v in all_vehicle.items()],
            key=lambda x: x["value"],
            reverse=True
        )
    },
    {
        "title": "Pedestrian Accidents Involvement by Vehicle Type",
        "rows": sorted(
            [{"label": k, "value": v} for k, v in all_pedestrian_accident.items()],
            key=lambda x: x["value"],
            reverse=True
        )
    },
    {
        "title": "Pedestrian Fatalities by Vehicle Type",
        "rows": sorted(
            [{"label": k, "value": v} for k, v in all_pedestrian_fatality.items()],
            key=lambda x: x["value"],
            reverse=True
        )
    }
]

with open("mort-state-bar-1.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("mort-state-bar-1.json generated successfully.")

cursor.close()
conn.close()