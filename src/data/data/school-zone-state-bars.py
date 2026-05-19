import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    database="iradlive_v1",
    user="postgres",
    password="root"
)

cur = conn.cursor()

query = """
WITH base AS (
    SELECT *
    FROM accident_nearest_road_details
    WHERE school_zone_id IS NOT NULL
      AND trim(school_zone_id) <> ''
),

states AS (
    SELECT DISTINCT
        lower(trim(state)) AS state_key,
        upper(trim(state)) AS state_name
    FROM base
    WHERE state IS NOT NULL
      AND trim(state) <> ''
),

combined_age AS (
    SELECT
        accident_id,
        age
    FROM veh_driver_details
    WHERE age IS NOT NULL

    UNION ALL

    SELECT
        accident_id,
        CASE
            WHEN TRIM(age) ~ '^[0-9]+$' THEN age::int
            ELSE NULL
        END AS age
    FROM veh_pedestrian_details

    UNION ALL

    SELECT
        accident_id,
        CASE
            WHEN TRIM(age) ~ '^[0-9]+$' THEN age::int
            ELSE NULL
        END AS age
    FROM veh_passenger_details
),

vehicle_pairs AS (
    SELECT
        accident_id,
        STRING_AGG(
            DISTINCT COALESCE(NULLIF(trim(vehicle_type), ''), 'Unknown/Missing'),
            ' + '
            ORDER BY COALESCE(NULLIF(trim(vehicle_type), ''), 'Unknown/Missing')
        ) AS vehicle_pair
    FROM veh_driver_details
    WHERE accident_id IS NOT NULL
    GROUP BY accident_id
)

SELECT json_build_object(
    'default', (
        SELECT json_agg(section)
        FROM (

            SELECT json_build_object(
                'title', 'Accidents by Junction Type',
                'rows', (
                    SELECT json_agg(
                        json_build_object(
                            'label', junction_type,
                            'value', accident_count
                        )
                        ORDER BY accident_count DESC
                    )
                    FROM (
                        SELECT
                            trim(rd.junction_type) AS junction_type,
                            COUNT(*) AS accident_count
                        FROM base b
                        JOIN road_details rd
                            ON rd.accident_id = b.accident_id
                        WHERE rd.junction_type IS NOT NULL
                          AND trim(rd.junction_type) <> ''
                        GROUP BY trim(rd.junction_type)
                        ORDER BY accident_count DESC
                    ) t
                )
            ) AS section

            UNION ALL

            SELECT json_build_object(
                'title', 'Accidents by Vehicle Pair',
                'rows', (
                    SELECT json_agg(
                        json_build_object(
                            'label', vehicle_pair,
                            'value', accident_count
                        )
                        ORDER BY accident_count DESC
                    )
                    FROM (
                        SELECT
                            vp.vehicle_pair,
                            COUNT(*) AS accident_count
                        FROM base b
                        JOIN vehicle_pairs vp
                            ON vp.accident_id = b.accident_id
                        WHERE vp.vehicle_pair IS NOT NULL
                          AND trim(vp.vehicle_pair) <> ''
                          AND vp.vehicle_pair LIKE '%+%'
                        GROUP BY vp.vehicle_pair
                        ORDER BY accident_count DESC
                        LIMIT 5
                    ) t
                )
            ) AS section
        ) x
    ),

    

    'states', (
        SELECT json_object_agg(
            state_key,
            state_sections
        )
        FROM (
            SELECT
                s.state_key,
                json_agg(section) AS state_sections
            FROM states s
            CROSS JOIN LATERAL (
                VALUES

                (
                    json_build_object(
                        'title', 'Accidents by Time Window',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', time_window,
                                    'value', accident_count
                                )
                                ORDER BY sort_order
                            )
                            FROM (
                                SELECT
                                    CASE
                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 5
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 10
                                            THEN 'Morning 5 am-10 am'

                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 10
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 16
                                            THEN 'Afternoon 10 am-4 pm'

                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 16
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 20
                                            THEN 'Evening 4 pm-8 pm'

                                        ELSE 'Night 8 pm-5 am'
                                    END AS time_window,

                                    CASE
                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 5
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 10
                                            THEN 1

                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 10
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 16
                                            THEN 2

                                        WHEN EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) >= 16
                                            AND EXTRACT(HOUR FROM TO_TIMESTAMP(b.accident_date_time, 'DD-Mon-YYYY : HH24:MI')) < 20
                                            THEN 3

                                        ELSE 4
                                    END AS sort_order,

                                    COUNT(*) AS accident_count
                                FROM base b
                                WHERE upper(trim(b.state)) = s.state_name
                                AND b.accident_date_time IS NOT NULL
                                AND trim(b.accident_date_time) <> ''
                                GROUP BY 1, 2
                            ) t
                        )
                    )
                ),

                (
                    json_build_object(
                        'title', 'Accidents by Age Group',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', age_group,
                                    'value', accident_count
                                )
                                ORDER BY sort_order
                            )
                            FROM (
                                SELECT
                                    CASE
                                        WHEN ca.age BETWEEN 0 AND 5 THEN '0-5 Years'
                                        WHEN ca.age BETWEEN 6 AND 18 THEN '6-18 Years'
                                        WHEN ca.age BETWEEN 19 AND 35 THEN '19-35 Years'
                                        WHEN ca.age BETWEEN 36 AND 60 THEN '36-60 Years'
                                        WHEN ca.age > 60 THEN '60+ Years'
                                        ELSE 'Missing'
                                    END AS age_group,

                                    CASE
                                        WHEN ca.age BETWEEN 0 AND 5 THEN 1
                                        WHEN ca.age BETWEEN 6 AND 18 THEN 2
                                        WHEN ca.age BETWEEN 19 AND 35 THEN 3
                                        WHEN ca.age BETWEEN 36 AND 60 THEN 4
                                        WHEN ca.age > 60 THEN 5
                                        ELSE 6
                                    END AS sort_order,

                                    COUNT(b.accident_id) AS accident_count
                                FROM base b
                                JOIN combined_age ca
                                    ON ca.accident_id = b.accident_id
                                WHERE upper(trim(b.state)) = s.state_name
                                GROUP BY 1, 2
                            ) t
                        )
                    )
                ),
                (
                    json_build_object(
                        'title', 'Pedestrian Accidents Involvement by Vehicle Type',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', vehicle_type,
                                    'value', pedestrian_accidents
                                )
                                ORDER BY pedestrian_accidents DESC
                            )
                            FROM (
                                SELECT
                                    TRIM(v.vehicle_type) AS vehicle_type,
                                    COUNT(DISTINCT b.accident_id) AS pedestrian_accidents
                                FROM base b
                                JOIN veh_driver_details v
                                    ON b.accident_id = v.accident_id
                                WHERE upper(trim(b.state)) = s.state_name
                                AND b.collision_type ILIKE '%Pedestrian%'
                                AND v.vehicle_type IS NOT NULL
                                AND TRIM(v.vehicle_type) <> ''
                                GROUP BY TRIM(v.vehicle_type)
                                ORDER BY pedestrian_accidents DESC
                            ) t
                        )
                    )
                ),

                (
                    json_build_object(
                        'title', 'Accidents by Year',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', accident_year::text,
                                    'value', accident_count
                                )
                                ORDER BY accident_year
                            )
                            FROM (
                                SELECT
                                    EXTRACT(
                                        YEAR FROM TO_TIMESTAMP(
                                            b.accident_date_time,
                                            'DD-Mon-YYYY : HH24:MI'
                                        )
                                    )::int AS accident_year,
                                    COUNT(DISTINCT b.accident_id) AS accident_count
                                FROM base b
                                WHERE upper(trim(b.state)) = s.state_name
                                AND b.accident_date_time IS NOT NULL
                                AND trim(b.accident_date_time) <> ''
                                GROUP BY 1
                            ) yearly_school_accidents
                        )
                    )
                ),

                
                (
                    json_build_object(
                        'title', 'Distribution of accidents mapped to school',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', bucket,
                                    'value', school_count
                                )
                                ORDER BY bucket_order
                            )
                            FROM (
                                SELECT
                                    CASE
                                        WHEN accident_count BETWEEN 1 AND 10 THEN '1-10'
                                        WHEN accident_count BETWEEN 11 AND 20 THEN '11-20'
                                        WHEN accident_count BETWEEN 21 AND 30 THEN '21-30'
                                        WHEN accident_count BETWEEN 31 AND 40 THEN '31-40'
                                        WHEN accident_count BETWEEN 41 AND 50 THEN '41-50'
                                        WHEN accident_count BETWEEN 51 AND 60 THEN '51-60'
                                        WHEN accident_count BETWEEN 61 AND 70 THEN '61-70'
                                        WHEN accident_count BETWEEN 71 AND 80 THEN '71-80'
                                        WHEN accident_count BETWEEN 81 AND 90 THEN '81-90'
                                        ELSE '91-100+'
                                    END AS bucket,

                                    COUNT(*) AS school_count,

                                    CASE
                                        WHEN accident_count BETWEEN 1 AND 10 THEN 1
                                        WHEN accident_count BETWEEN 11 AND 20 THEN 2
                                        WHEN accident_count BETWEEN 21 AND 30 THEN 3
                                        WHEN accident_count BETWEEN 31 AND 40 THEN 4
                                        WHEN accident_count BETWEEN 41 AND 50 THEN 5
                                        WHEN accident_count BETWEEN 51 AND 60 THEN 6
                                        WHEN accident_count BETWEEN 61 AND 70 THEN 7
                                        WHEN accident_count BETWEEN 71 AND 80 THEN 8
                                        WHEN accident_count BETWEEN 81 AND 90 THEN 9
                                        ELSE 10
                                    END AS bucket_order
                                FROM (
                                    SELECT
                                        sz.school_name,
                                        COUNT(b.accident_id) AS accident_count
                                    FROM base b
                                    JOIN school_zones sz
                                        ON sz.id::text = b.school_zone_id
                                    WHERE upper(trim(b.state)) = s.state_name
                                    GROUP BY sz.school_name
                                ) school_accident_counts
                                GROUP BY 1, 3
                            ) bucketed_counts
                        )
                    )
                ),
                (
                    json_build_object(
                        'title', 'Pedestrian Accidents',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', school_name,
                                    'value', accident_count
                                )
                                ORDER BY accident_count DESC
                            )
                            FROM (
                                SELECT
                                    sz.school_name,
                                    COUNT(b.accident_id) AS accident_count
                                FROM base b
                                JOIN school_zones sz
                                    ON sz.id::text = b.school_zone_id
                                WHERE upper(trim(b.state)) = s.state_name
                                AND (
                                        COALESCE(b.pedestrian_killed, 0) > 0
                                    OR COALESCE(b.pedestrian_grievous_injury, 0) > 0
                                    OR COALESCE(b.pedestrian_minor_injury, 0) > 0
                                )
                                GROUP BY sz.school_name
                                ORDER BY accident_count DESC
                                LIMIT 10
                            ) t
                        )
                    )
                ),
                                (
                    json_build_object(
                        'title', 'Accidents by Junction Type',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', junction_type,
                                    'value', accident_count
                                )
                                ORDER BY accident_count DESC
                            )
                            FROM (
                                SELECT
                                    trim(rd.junction_type) AS junction_type,
                                    COUNT(*) AS accident_count
                                FROM base b
                                JOIN road_details rd
                                    ON rd.accident_id = b.accident_id
                                WHERE upper(trim(b.state)) = s.state_name
                                  AND rd.junction_type IS NOT NULL
                                  AND trim(rd.junction_type) <> ''
                                GROUP BY trim(rd.junction_type)
                                ORDER BY accident_count DESC
                            ) t
                        )
                    )
                ),

                (
                    json_build_object(
                        'title', 'Accidents by Vehicle Pair',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', vehicle_pair,
                                    'value', accident_count
                                )
                                ORDER BY accident_count DESC
                            )
                            FROM (
                                SELECT
                                    vp.vehicle_pair,
                                    COUNT(*) AS accident_count
                                FROM base b
                                JOIN vehicle_pairs vp
                                    ON vp.accident_id = b.accident_id
                                WHERE upper(trim(b.state)) = s.state_name
                                  AND vp.vehicle_pair IS NOT NULL
                                  AND trim(vp.vehicle_pair) <> ''
                                  AND vp.vehicle_pair LIKE '%+%'
                                GROUP BY vp.vehicle_pair
                                ORDER BY accident_count DESC
                            ) t
                        )
                    )
                ),

                (
                    json_build_object(
                        'title', 'Accidents by Type',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', collision_type,
                                    'value', accident_count
                                )
                                ORDER BY accident_count DESC
                            )
                            FROM (
                                SELECT
                                    collision_type,
                                    COUNT(DISTINCT accident_id) AS accident_count
                                FROM (
                                    SELECT
                                        b.accident_id,
                                        COALESCE(
                                            NULLIF(TRIM(split_value), ''),
                                            'Unknown/Missing'
                                        ) AS collision_type
                                    FROM base b
                                    LEFT JOIN LATERAL unnest(
                                        CASE
                                            WHEN b.collision_type IS NULL
                                                 OR TRIM(b.collision_type) = ''
                                                THEN ARRAY['Unknown/Missing']
                                            ELSE string_to_array(b.collision_type, ',')
                                        END
                                    ) AS split_value ON TRUE
                                    WHERE upper(trim(b.state)) = s.state_name
                                ) t
                                GROUP BY collision_type
                                ORDER BY accident_count DESC
                            ) x
                        )
                    )
                ),

                (
                    json_build_object(
                        'title', 'Accidents by Nature',
                        'rows', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', collision_nature,
                                    'value', accident_count
                                )
                                ORDER BY accident_count DESC
                            )
                            FROM (
                                SELECT
                                    collision_nature,
                                    COUNT(DISTINCT accident_id) AS accident_count
                                FROM (
                                    SELECT
                                        b.accident_id,
                                        COALESCE(
                                            NULLIF(TRIM(split_value), ''),
                                            'Unknown/Missing'
                                        ) AS collision_nature
                                    FROM base b
                                    LEFT JOIN LATERAL unnest(
                                        CASE
                                            WHEN b.collision_nature IS NULL
                                                 OR TRIM(b.collision_nature) = ''
                                                THEN ARRAY['Unknown/Missing']
                                            ELSE string_to_array(b.collision_nature, ',')
                                        END
                                    ) AS split_value ON TRUE
                                    WHERE upper(trim(b.state)) = s.state_name
                                ) t
                                GROUP BY collision_nature
                                ORDER BY accident_count DESC
                            ) x
                        )
                    )
                )

            ) AS section(section)
            GROUP BY s.state_key
        ) z
    )
);
"""

cur.execute(query)
result = cur.fetchone()[0]

with open("school-state-bars-1.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)

print("school-state-bars-1.json generated successfully")

cur.close()
conn.close()