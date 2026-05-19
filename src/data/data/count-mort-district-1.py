import json

# Load district JSON file
with open("mort-districts-1.json", "r", encoding="utf-8") as f:
    data = json.load(f)

district_data_by_state = data.get("district_data_by_state", {})

state_summary = {}

# Loop through each state
for state_name, districts in district_data_by_state.items():

    total_fatalities = 0
    total_grievous = 0
    total_fg = 0
    total_fg_covered = 0
    total_blackspots = 0
    total_corridors = 0
    total_fatal_accidents = 0
    total_grievous_accidents = 0

    # Loop through each district inside state
    for district_name, district_info in districts.items():
        total_fatalities += district_info.get("total_fatalities", 0)
        total_grievous += district_info.get("total_grievous", 0)
        total_fg += district_info.get("total_fg", 0)
        total_fg_covered += district_info.get("fg_covered", 0)
        total_blackspots += district_info.get("blackspots", 0)
        total_corridors += district_info.get("corridors", 0)
        total_fatal_accidents += district_info.get("total_fatal_accidents", 0)
        total_grievous_accidents += district_info.get("total_grievous_accidents", 0)

    state_summary[state_name] = {
        "state_name": state_name.upper(),
        "total_fatal_accidents": int(total_fatal_accidents),
        "total_grievous_accidents": int(total_grievous_accidents),
        "total_fatalities": round(total_fatalities, 0),
        "total_grievous": round(total_grievous, 0),
        "total_fg": round(total_fg, 0),
        "fg_covered": round(total_fg_covered, 0),
        "blackspots": total_blackspots,
        "corridors": total_corridors
    }

# Save result
with open("mort-districts-states-summary.json", "w", encoding="utf-8") as f:
    json.dump(state_summary, f, indent=2, ensure_ascii=False)

print("mort-districts-states-summary.json generated successfully.")