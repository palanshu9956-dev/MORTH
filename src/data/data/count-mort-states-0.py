import json

# Load mort-states.json
with open("mort-states.json", "r", encoding="utf-8") as file:
    states = json.load(file)

# Initialize totals
total_length_processed = 0
total_agency_length = 0
total_agency_corridors = 0
total_agency_accidents = 0
total_agency_fatalities = 0

# Loop through all states
for state in states:
    # Sum state-level total_length_processed
    total_length_processed += float(state.get("total_length_processed", 0) or 0)

    # Sum all agency values inside each state
    for agency in state.get("agencies", []):
        total_agency_length += float(agency.get("length", 0) or 0)
        total_agency_corridors += int(agency.get("corridors", 0) or 0)
        total_agency_accidents += int(agency.get("accidents", 0) or 0)
        total_agency_fatalities += int(agency.get("fatalities", 0) or 0)

# Print results
print("Total state total_length_processed:", round(total_length_processed, 1))
print("Total agency length sum:", round(total_agency_length, 1))
print("Total agency corridors sum:", total_agency_corridors)
print("Total agency accidents sum:", total_agency_accidents)
print("Total agency fatalities sum:", total_agency_fatalities)