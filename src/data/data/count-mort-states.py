import json
from collections import defaultdict

# Load mort-states.json
with open("mort-states.json", "r", encoding="utf-8") as file:
    states = json.load(file)

# Initialize totals
total_length_processed = 0
total_agency_length = 0
total_agency_corridors = 0
total_agency_accidents = 0
total_agency_fatalities = 0

# India summary totals
total_accidents_india_three_years = 0
total_fatal_accidents_india_three_years = 0
total_grievous_accidents_india_three_years = 0

# Dictionaries for national aggregation
violation_totals = defaultdict(int)
crash_type_totals = defaultdict(int)
crash_nature_totals = defaultdict(int)

# Loop through all states
for state in states:
    # Sum state-level total_length_processed
    total_length_processed += float(state.get("total_length_processed", 0) or 0)

    # Sum india_summary values
    india_summary = state.get("india_summary", {})

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
    for agency in state.get("agencies", []):
        total_agency_length += float(agency.get("length", 0) or 0)
        total_agency_corridors += int(agency.get("corridors", 0) or 0)
        total_agency_accidents += int(agency.get("accidents", 0) or 0)
        total_agency_fatalities += int(agency.get("fatalities", 0) or 0)

    # Sum violations by name
    for violation in state.get("violations", []):
        name = violation.get("name", "Unknown")
        count = int(violation.get("count", 0) or 0)
        violation_totals[name] += count

    # Sum crash types by name
    for crash_type in state.get("crash_types", []):
        name = crash_type.get("name", "Unknown")
        count = int(crash_type.get("count", 0) or 0)
        crash_type_totals[name] += count

    # Sum crash natures by name
    for crash_nature in state.get("crash_natures", []):
        name = crash_nature.get("name", "Unknown")
        count = int(crash_nature.get("count", 0) or 0)
        crash_nature_totals[name] += count

# Convert to sorted list format
national_violations = sorted(
    [{"name": k, "count": v} for k, v in violation_totals.items()],
    key=lambda x: x["count"],
    reverse=True
)

national_crash_types = sorted(
    [{"name": k, "count": v} for k, v in crash_type_totals.items()],
    key=lambda x: x["count"],
    reverse=True
)

national_crash_natures = sorted(
    [{"name": k, "count": v} for k, v in crash_nature_totals.items()],
    key=lambda x: x["count"],
    reverse=True
)

# Print totals
print("Total state total_length_processed:", round(total_length_processed, 1))
print("Total agency length sum:", round(total_agency_length, 1))
print("Total agency corridors sum:", total_agency_corridors)
print("Total agency accidents sum:", total_agency_accidents)
print("Total agency fatalities sum:", total_agency_fatalities)

print("\nIndia Summary Totals:")
print("Total Accidents India (3 Years):", total_accidents_india_three_years)
print("Total Fatal Accidents India (3 Years):", total_fatal_accidents_india_three_years)
print("Total Grievous Accidents India (3 Years):", total_grievous_accidents_india_three_years)

print("\nNational Violations:")
print(json.dumps(national_violations, indent=4))

print("\nNational Crash Types:")
print(json.dumps(national_crash_types, indent=4))

print("\nNational Crash Natures:")
print(json.dumps(national_crash_natures, indent=4))