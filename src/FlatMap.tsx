import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinate } from './data'
import { asset, bounds, inside, loadMap } from './geo'
import type { ViewerProps } from './viewer'

const box = L.latLngBounds([bounds.south,bounds.west],[bounds.north,bounds.east])
const position = ([lon,lat]: Coordinate): L.LatLngTuple => [lat,lon]
const smooth = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function FlatMap(props:ViewerProps) {
  const container = useRef<HTMLDivElement>(null)
  const current = useRef(props)
  const update = useRef<(value:ViewerProps) => void | undefined>(undefined)
  const [error,setError]=useState(false)
  current.current=props

  useEffect(() => {
    const element=container.current
    if (!element) return
    const map=L.map(element,{ zoomControl:false, scrollWheelZoom:false, attributionControl:false, zoomSnap:.1,
      zoomDelta:.5, maxZoom:18, minZoom:11, maxBounds:box.pad(.52), maxBoundsViscosity:.85, preferCanvas:true,
    })
    map.fitBounds(box,{animate:false})
    map.createPane('relief').style.zIndex='250'
    L.imageOverlay(asset('terrain/relief.webp'),box,{pane:'relief',alt:'紫金山地形晕渲'}).addTo(map)
    L.control.scale({imperial:false,maxWidth:85}).addTo(map)
    map.createPane('greenery').style.zIndex='320'
    map.createPane('roads').style.zIndex='360'
    map.createPane('routes').style.zIndex='430'
    const paths=L.layerGroup().addTo(map)
    const symbols=L.layerGroup().addTo(map)
    const route=L.layerGroup().addTo(map)
    let destroyed=false
    let lastCommand=-1
    let old: ViewerProps | undefined
    const ro = new ResizeObserver(() => map.invalidateSize({pan:false}))
    ro.observe(element)
    map.on('click',() => current.current.onClear())
    for (const name of ['dragstart','zoomstart']) map.on(name,() => { element.dataset.interacted='true' })

    loadMap().then(data => {
      if (destroyed) return
      for (const { geometry,properties } of data.features) {
        const kind=properties.kind
        if (geometry.type==='Polygon') {
          const styles: L.PolylineOptions = kind==='water' ? {color:'#7a9a8f',weight:.7,fillColor:'#99b5a5',fillOpacity:.89}
            : kind==='forest' ? {stroke:false,fillColor:'#5c8c61',fillOpacity:.14}
            : {dashArray:'6 5',color:'#465c47',weight:1.4,fillOpacity:0}
          L.polygon(geometry.coordinates.map(ring=>ring.map(position)),{...styles,pane:'greenery',interactive:false}).addTo(paths)
        } else {
          const style: L.PolylineOptions = kind==='cable' ? {color:'#916c3c',weight:1.8,dashArray:'5 4',opacity:.7}
            : kind==='road' ? {color:'#fffbed',weight:properties.name?2.4:1.35,opacity:.87}
            : {color:'#8b7350',weight:1.05,opacity:.53,dashArray:'2 3'}
          L.polyline(geometry.coordinates.map(position),{...style,pane:'roads',interactive:false}).addTo(paths)
        }
      }
    }).catch(() => {if (!destroyed) setError(true)})
    const refresh=(next:ViewerProps) => {
      if (next.visibleSpots!==old?.visibleSpots || next.selected!==old?.selected || next.location!==old?.location) {
        symbols.clearLayers()
        const entries=new Set<string>()
        for (const spot of next.visibleSpots) {
          const pos:Coordinate=[spot.longitude,spot.latitude]
          const isSelected=next.selected?.id===spot.id
          const label = document.createElement('span')
          label.className='map-pin-label'
          label.textContent = spot.shortName??spot.name
          const icon=L.divIcon({className:'map-pin'+(isSelected?' is-selected':''),iconSize:[16,16],iconAnchor:[8,8],html:label})
          L.marker(position(pos),{icon,title:spot.name,alt:spot.name,zIndexOffset:isSelected?1000:0})
            .on('click',() => current.current.onSelect(spot)).addTo(symbols)
          const entry=spot.entranceCoordinates
          if (entry && entry.join(',')!==pos.join(',') && !entries.has(entry.join(','))) {
            entries.add(entry.join(','))
            L.circleMarker(position(entry),{radius:4.7,weight:1.35,color:'#67471d',fillColor:'#fff9e1',fillOpacity:1})
              .bindTooltip(spot.entranceName??'游客入口').on('click',() => current.current.onSelect(spot)).addTo(symbols)
          }
        }
        if (next.location && inside(next.location.point)) {
          const pos=position(next.location.point)
          L.circle(pos,{radius:next.location.accuracy,color:'#286bef',weight:1,fillOpacity:.13,interactive:false}).addTo(symbols)
          L.circleMarker(pos,{radius:7,color:'white',weight:2,fillColor:'#286bef',fillOpacity:1})
            .bindTooltip('我的位置').addTo(symbols)
        }
      }
      if (next.activeRoute!==old?.activeRoute) {
        route.clearLayers()
        if (next.activeRoute) {
          const path=next.activeRoute.geometry.map(position)
          L.polyline(path,{pane:'routes',color:'#f9f0d7',weight:8,interactive:false}).addTo(route)
          L.polyline(path,{pane:'routes',color:'#85602f',weight:4,interactive:false}).addTo(route)
          L.circleMarker(path[0],{pane:'routes',radius:5,weight:2,color:'#583b21',fillColor:'#fff6d5',fillOpacity:1}).bindTooltip('起点').addTo(route)
          L.circleMarker(path[path.length-1],{pane:'routes',radius:5,weight:2,color:'#583b21',fillColor:'#bb8f56',fillOpacity:1}).bindTooltip('终点').addTo(route)
        }
      }
      if (next.command.serial!==lastCommand) {
        lastCommand=next.command.serial
        if (next.command.action==='focus' && next.selected) {
          const spot=next.selected
          map.setView([spot.latitude,spot.longitude],Math.max(map.getZoom(),15.35),{animate:smooth()})
        } else if (next.command.action==='route' && next.activeRoute) {
          map.fitBounds(L.latLngBounds(next.activeRoute.geometry.map(position)),{padding:[45,85],maxZoom:15.7,animate:smooth()})
        } else if (next.command.action==='locate' && next.location && inside(next.location.point)) {
          map.setView(position(next.location.point),15.2,{animate:smooth()})
        } else if (next.command.action==='reset') {
          map.fitBounds(box,{animate:smooth()})
        }
      }
      old=next
    }
    const onZoom = (event:Event) => map.setZoom(map.getZoom()+((event as CustomEvent<number>).detail>1?.65:-.65))
    const parent=element.parentElement!
    parent.addEventListener('atlas-zoom',onZoom)
    update.current=refresh
    refresh(current.current)
    return () => {
      destroyed=true
      parent.removeEventListener('atlas-zoom',onZoom)
      ro.disconnect()
      map.remove()
      update.current=undefined
    }
  },[])
  useEffect(() => update.current?.(props),[props])
  return <>
    <div className="flat-map" ref={container} data-viewer="map" aria-label="紫金山二维地图"/>
    <div className="compass flat-compass" aria-label="上方为北"><span>N</span><i/></div>
    {error && <div className="loading-atlas" role="status">道路图层加载失败，仍可查看高程和景点。</div>}
  </>
}
