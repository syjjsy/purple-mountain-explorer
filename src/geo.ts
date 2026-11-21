import type { Coordinate } from './data'

export const bounds = { west: 118.808, south: 32.041, east: 118.876, north: 32.082 }
export const center: Coordinate = [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2]
const earthRadius = 6371008.8
const radians = Math.PI / 180
const northMeters = earthRadius * radians
const eastMeters = northMeters * Math.cos(center[1] * radians)
export const sceneScale = 0.001
export const verticalExaggeration = 2.8
export const sceneWidth = (bounds.east - bounds.west) * eastMeters * sceneScale
export const sceneDepth = (bounds.north - bounds.south) * northMeters * sceneScale

export function toLocal([lon, lat]: Coordinate) {
  return [(lon - center[0]) * eastMeters * sceneScale, (center[1] - lat) * northMeters * sceneScale] as const
}
export function fromLocal(x: number, z: number): Coordinate {
  return [x / (eastMeters * sceneScale) + center[0], center[1] - z / (northMeters * sceneScale)]
}
export function inside([lon, lat]: Coordinate) {
  return lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north
}
export function distance([a, b]: Coordinate, [c, d]: Coordinate) {
  const h = Math.sin((d-b)*radians/2)**2 + Math.cos(b*radians)*Math.cos(d*radians)*Math.sin((c-a)*radians/2)**2
  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}
export function asset(path: string) { return import.meta.env.BASE_URL + path }
export function mapLink(point: Coordinate, name: string) {
  return 'https://uri.amap.com/marker?' + new URLSearchParams({ position: point.join(','), name, coordinate: 'wgs84', callnative: '1', src: 'PurpleMountainExplorer' })
}
export interface LocationFix { point: Coordinate; accuracy: number }
export function locationText(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} 米` : `${(meters / 1000).toFixed(1)} 公里`
}

export interface TerrainMeta { columns: number; rows: number; bounds: number[]; min: number; max: number }
export interface TerrainData { field: DataView; meta: TerrainMeta }
type Shape = { type: 'LineString'; coordinates: Coordinate[] } | { type: 'Polygon'; coordinates: Coordinate[][] }
export interface MapFeature {
  type: 'Feature'
  properties: { kind: 'trail'|'road'|'water'|'boundary'|'forest'|'cable'; name: string; osmWay: number }
  geometry: Shape
}
export interface MapData { type: 'FeatureCollection'; features: MapFeature[] }
let terrainRequest: Promise<TerrainData> | undefined
let mapRequest: Promise<MapData> | undefined
async function load(path: string) {
  const response = await fetch(asset(path))
  if (!response.ok) throw new Error(`加载失败 ${response.status}`)
  return response
}
export function loadTerrain() {
  terrainRequest ??= Promise.all([load('terrain/metadata.json').then(r => r.json() as Promise<TerrainMeta>), load('terrain/zhongshan.i16').then(r => r.arrayBuffer())]).then(([meta, buffer]) => {
    if (buffer.byteLength !== meta.columns * meta.rows * 2 ||
        meta.bounds.some((value, index) => value !== [bounds.west,bounds.south,bounds.east,bounds.north][index])) throw new Error('地形索引与高程数据不一致')
    return { field: new DataView(buffer), meta }
  }).catch(error => { terrainRequest = undefined; throw error })
  return terrainRequest
}
export function loadMap() {
  mapRequest ??= load('geojson/zhongshan.geojson').then(r => r.json() as Promise<MapData>).catch(error => {
    mapRequest = undefined
    throw error
  })
  return mapRequest
}
export function elevation(data: TerrainData, [lon, lat]: Coordinate) {
  const { columns, rows } = data.meta
  const x = Math.min(columns-1, Math.max(0, (lon-bounds.west)/(bounds.east-bounds.west)*(columns-1)))
  const y = Math.min(rows-1, Math.max(0, (bounds.north-lat)/(bounds.north-bounds.south)*(rows-1)))
  const i = Math.min(columns-2, Math.floor(x)), j = Math.min(rows-2, Math.floor(y))
  const u = x-i, v = y-j
  const a = (j*columns+i)*2
  const b = a+columns*2
  const get = (offset: number) => data.field.getInt16(offset, true) / 10
  return (1-v)*((1-u)*get(a)+u*get(a+2)) + v*((1-u)*get(b)+u*get(b+2))
}
export function worldHeight(data: TerrainData, coordinate: Coordinate) {
  return 0.004 + (elevation(data, coordinate) - data.meta.min) * sceneScale * verticalExaggeration
}
