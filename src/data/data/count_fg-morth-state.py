import json

# Load JSON file
with open("mort-states.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Initialize totals
total_fg = 0
total_grievous = 0
total_fatalities = 0
total_fg_covered = 0

# Loop through all states
for state in data:
    total_fg += state.get("total_fg", 0)
    total_grievous += state.get("total_grievous", 0)
    total_fatalities += state.get("total_fatalities", 0)
    total_fg_covered += state.get("fg_covered", 0)

# Print results
print("Total FG:", total_fg)
print("Total Grievous:", total_grievous)
print("Total Fatalities:", total_fatalities)
print("Total FG Covered:", total_fg_covered)