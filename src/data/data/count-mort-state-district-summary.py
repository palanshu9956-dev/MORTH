import json

# Load state summary JSON
with open("mort-districts-states-summary.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Initialize totals
total_fatal_accidents = 0
total_grievous_accidents = 0
total_fatalities = 0
total_grievous = 0
total_fg = 0
total_fg_covered = 0
total_blackspots = 0
total_corridors = 0

# Sum all states
for state_name, state_data in data.items():
    total_fatal_accidents += state_data.get("total_fatal_accidents", 0)
    total_grievous_accidents += state_data.get("total_grievous_accidents", 0)
    total_fatalities += state_data.get("total_fatalities", 0)
    total_grievous += state_data.get("total_grievous", 0)
    total_fg += state_data.get("total_fg", 0)
    total_fg_covered += state_data.get("fg_covered", 0)
    total_blackspots += state_data.get("blackspots", 0)
    total_corridors += state_data.get("corridors", 0)

# Print totals
print("India Level Totals")
print("-" * 40)
print("Total Fatal Accidents      :", total_fatal_accidents)
print("Total Grievous Accidents   :", total_grievous_accidents)
print("Total Fatalities           :", total_fatalities)
print("Total Grievous Injuries    :", total_grievous)
print("Total Fatal + Grievous     :", total_fg)
print("FG Covered                 :", total_fg_covered)
print("Blackspots                 :", total_blackspots)
print("Corridors                  :", total_corridors)