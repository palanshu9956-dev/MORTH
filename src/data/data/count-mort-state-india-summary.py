import json

# Load mort-state-india-summary.json
with open("mort-state-india-summary.json", "r", encoding="utf-8") as file:
    data = json.load(file)

states = data.get("states", {})

# Initialize totals
total_states = 0

total_accidents_india_three_years = 0
total_fatal_accidents_india_three_years = 0
total_grievous_accidents_india_three_years = 0

# Loop through all states
for state_key, state_data in states.items():
    total_states += 1

    total_accidents_india_three_years += int(
        state_data.get("total_accidents_india_three_years", 0) or 0
    )

    total_fatal_accidents_india_three_years += int(
        state_data.get("total_fatal_accidents_india_three_years", 0) or 0
    )

    total_grievous_accidents_india_three_years += int(
        state_data.get("total_grievous_accidents_india_three_years", 0) or 0
    )

# Print totals
print("Total states:", total_states)

print("\nIndia Summary Totals:")
print("Total Accidents India (3 Years):", total_accidents_india_three_years)
print("Total Fatal Accidents India (3 Years):", total_fatal_accidents_india_three_years)
print("Total Grievous Accidents India (3 Years):", total_grievous_accidents_india_three_years)