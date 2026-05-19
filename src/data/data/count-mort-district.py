import json

# Load mort-districts.json
with open("mort-districts.json", "r", encoding="utf-8") as file:
    data = json.load(file)

district_data = data.get("district_data_by_state", {})

# Initialize totals
total_districts = 0
total_length_processed = 0
total_agency_length = 0
total_agency_corridors = 0
total_agency_accidents = 0
total_agency_fatalities = 0
total_fg_covered = 0
total_blackspots = 0
total_corridors = 0
total_total_fg = 0
total_fatalities = 0
total_grievous = 0
total_fatal_accidents = 0
total_grievous_accidents = 0

# India summary totals
total_accidents_india_three_years = 0
total_fatal_accidents_india_three_years = 0
total_grievous_accidents_india_three_years = 0

# Loop through all states and districts
for state_name, districts in district_data.items():
    for district_name, district in districts.items():
        total_districts += 1

        total_length_processed += float(district.get("total_length_processed", 0) or 0)
        total_fg_covered += float(district.get("fg_covered", 0) or 0)
        total_blackspots += int(district.get("blackspots", 0) or 0)
        total_corridors += int(district.get("corridors", 0) or 0)
        total_total_fg += float(district.get("total_fg", 0) or 0)
        total_fatalities += float(district.get("total_fatalities", 0) or 0)
        total_grievous += float(district.get("total_grievous", 0) or 0)
        total_fatal_accidents += int(district.get("total_fatal_accidents", 0) or 0)
        total_grievous_accidents += int(district.get("total_grievous_accidents", 0) or 0)

        # Sum india_summary values
        india_summary = district.get("india_summary", {})

        total_accidents_india_three_years += int(
            india_summary.get("total_accidents_india_three_years", 0) or 0
        )

        total_fatal_accidents_india_three_years += int(
            india_summary.get("total_fatal_accidents_india_three_years", 0) or 0
        )

        total_grievous_accidents_india_three_years += int(
            india_summary.get("total_grievous_accidents_india_three_years", 0) or 0
        )

        # Sum agency values
        for agency in district.get("agencies", []):
            total_agency_length += float(agency.get("length", 0) or 0)
            total_agency_corridors += int(agency.get("corridors", 0) or 0)
            total_agency_accidents += int(agency.get("accidents", 0) or 0)
            total_agency_fatalities += int(agency.get("fatalities", 0) or 0)

# Print totals
print("Total districts:", total_districts)
print("Total district total_length_processed:", round(total_length_processed, 1))
print("Total district fg_covered:", round(total_fg_covered, 1))
print("Total district blackspots:", total_blackspots)
print("Total district corridors:", total_corridors)
print("Total district total_fg:", round(total_total_fg, 1))
print("Total district fatalities:", round(total_fatalities, 1))
print("Total district grievous:", round(total_grievous, 1))
print("Total district fatal accidents:", total_fatal_accidents)
print("Total district grievous accidents:", total_grievous_accidents)

print("\nIndia Summary Totals:")
print("Total Accidents India (3 Years):", total_accidents_india_three_years)
print("Total Fatal Accidents India (3 Years):", total_fatal_accidents_india_three_years)
print("Total Grievous Accidents India (3 Years):", total_grievous_accidents_india_three_years)

print("\nAgency totals:")
print("Total agency length:", round(total_agency_length, 1))
print("Total agency corridors:", total_agency_corridors)
print("Total agency accidents:", total_agency_accidents)
print("Total agency fatalities:", total_agency_fatalities)