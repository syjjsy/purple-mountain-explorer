import type { ScenicRoute, ScenicSpot } from './data'
import type { LocationFix } from './geo'
export interface ViewerProps {
  visibleSpots: ScenicSpot[]
  selected: ScenicSpot | null
  activeRoute: ScenicRoute | null
  location: LocationFix | null
  command: { serial: number; action: 'focus'|'reset'|'route'|'locate' }
  onSelect: (spot: ScenicSpot) => void
  onClear: () => void
}
