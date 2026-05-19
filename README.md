# MORTH Road Safety Dashboard - React Version

A React-based interactive dashboard for analyzing road safety data, blackspots, and accident statistics across Indian states. Built with React, Leaflet, and modern web technologies.

## Features

- 🗺️ **Interactive Map Visualization** - Navigate through India, states, districts, and pincodes
- 📊 **Comprehensive Analytics** - View accident statistics, fatalities, and injury data
- 🎯 **Blackspot Analysis** - Identify and analyze high-risk road corridors
- 📈 **State-wise Comparisons** - Compare safety metrics across different states
- 🔍 **Drill-down Navigation** - From country level → state → district → pincode
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Project Structure

```
morth-react/
├── public/
│   ├── index.html
│   └── data/
│       ├── INDIA_STATES.geojson
│       ├── INDIA_DISTRICTS.geojson
│       └── INDIAN_PINCODE_BOUNDARY.geojson
├── src/
│   ├── components/
│   │   ├── MapComponent.jsx
│   │   ├── AnalyticsPanel.jsx
│   │   ├── Header.jsx
│   │   └── StateDetailPanel.jsx
│   ├── data/
│   │   └── morthData.js
│   ├── utils/
│   │   └── helpers.js
│   ├── styles/
│   │   ├── header.css
│   │   ├── map.css
│   │   ├── analytics.css
│   │   └── detail-panel.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.jsx
│   └── index.css
├── package.json
└── README.md
```

## Installation

1. Navigate to the project directory:
   ```bash
   cd /home/akash/morth-dash/morth-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To start the development server:

```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Building for Production

To create an optimized production build:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Key Components

### MapComponent
- Renders interactive Leaflet map
- Handles state, district, and pincode visualization
- Provides hover tooltips with MORTH data

### AnalyticsPanel
- Displays summary statistics
- Shows state rankings and agency data
- Includes bar charts and comparative analysis

### StateDetailPanel
- Shows detailed metrics for selected state
- Breaks down crash types, violations, and natures
- Displays distribution charts

### Header
- Navigation breadcrumb
- Dashboard title and description

## Data Format

The application uses GeoJSON format for geographical data:
- `INDIA_STATES.geojson` - State boundaries
- `INDIA_DISTRICTS.geojson` - District boundaries
- `INDIAN_PINCODE_BOUNDARY.geojson` - Pincode area boundaries

MORTH data is structured in `src/data/morthData.js` with:
- Summary statistics
- State-wise accident data
- Agency information
- Rankings and distributions

## Technologies Used

- **React 18** - UI framework
- **Leaflet** - Interactive maps
- **React-Leaflet** - Leaflet bindings for React
- **CSS3** - Styling and responsive design
- **JavaScript ES6+** - Modern JavaScript features

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Lazy loading of GeoJSON data
- Optimized re-renders with React hooks
- Efficient geospatial calculations
- Responsive image handling

## Future Enhancements

- Add time-series data visualization
- Implement filtering and search functionality
- Add data export features (PDF, CSV)
- Mobile app version
- Real-time data updates

## License

ISC

## Author

Akash

## Support

For issues or questions, please contact the development team.
