/**
 * Geographic constants for Costa Rica interactive maps
 */

// Bounding box covering mainland Costa Rica from coast to coast and border to border
// [Southwest [Lat, Lng], Northeast [Lat, Lng]]
// South: Punta Burica/Osa (~8.0° N), North: Peñas Blancas/Upala (~11.25° N)
// West: Cabo Santa Elena/Guanacaste (~-85.95° W), East: Sixaola/Limón (~-82.55° W)
export const COSTA_RICA_BOUNDS: [[number, number], [number, number]] = [
  [8.0, -85.95],
  [11.25, -82.55],
];

// Geographic center of mainland Costa Rica
export const COSTA_RICA_CENTER: [number, number] = [9.63, -84.25];

// Default zoom level to see the entire country comfortably
export const COSTA_RICA_DEFAULT_ZOOM = 7.2;
