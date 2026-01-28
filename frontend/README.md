# Trip Planner Frontend

React + TypeScript frontend for the trip planning application.

## Project Structure

```
src/
├── App.tsx                 # Main application component
├── index.css              # Global styles
├── components/
│   ├── AutocompleteDropdown.tsx  # Location search dropdown
│   ├── TripSettings.tsx          # Origin/destination inputs
│   ├── MatrixStatus.tsx          # Distance matrix status display
│   ├── POIForm.tsx               # Add new POI form
│   ├── POIList.tsx               # List of POIs with delete
│   ├── RouteResult.tsx           # Optimization result display
│   └── Map.tsx                   # Leaflet map component
├── services/
│   └── api.ts             # API client for backend calls
├── types/
│   └── index.ts           # TypeScript interfaces
├── utils/
│   ├── hooks.ts           # Custom React hooks (debounce)
│   └── polyline.ts        # Polyline decoder for routes
└── styles/
    ├── App.css
    ├── AutocompleteDropdown.css
    ├── TripSettings.css
    ├── MatrixStatus.css
    ├── POIForm.css
    ├── POIList.css
    ├── RouteResult.css
    └── Map.css
```

## Key Features

- **Modular Components**: Each UI section is a separate component
- **Service Layer**: All API calls centralized in `services/api.ts`
- **Type Safety**: Shared TypeScript types for consistency
- **External CSS**: All styles moved to separate CSS files
- **Custom Hooks**: Reusable hooks like `useDebounce`
- **Utilities**: Helper functions for polyline decoding

## Component Hierarchy

```
App
├── TripSettings (origin/destination inputs)
│   └── AutocompleteDropdown
├── MatrixStatus (distance matrix info)
├── POIForm (add POI form)
│   └── AutocompleteDropdown
├── POIList (POI items with delete)
├── RouteResult (optimization results)
└── Map (Leaflet map with markers/routes)
```

## Development

All inline styles have been extracted to CSS files in `src/styles/`. Each component has its own CSS file for maintainability.

## API Integration

The `services/api.ts` file provides typed functions for all backend endpoints:

- `fetchPOIs()` - Get all POIs with sequence numbers
- `createPOI()` - Add new POI
- `deletePOI()` - Delete POI
- `fetchMatrixStatus()` - Get matrix completion status
- `buildMatrix()` - Start matrix building
- `fetchOptimizedTrip()` - Get current optimized state
- `optimizeTrip()` - Optimize trip route
- `searchLocation()` - Geocode search

## Styling

All components use BEM-like naming conventions:
- `.component-name` for component root
- `.component-name-element` for child elements
- `.component-name--modifier` for variations
