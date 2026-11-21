import { useEffect, useRef, useState } from 'react'
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, Compass, ExternalLink, MapPin, Mountain, Navigation, X } from 'lucide-react'
import { guide, spotById, type ScenicRoute, type ScenicSpot } from './data'
import { distance, locationText, mapLink, type LocationFix } from './geo'
import { Credit, External, getPhoto, PhotoFrame, SpotChip, Visit } from './ui'

interface Props {
  spot?: ScenicSpot
  route?: ScenicRoute
  location: LocationFix|null
  saved: boolean
  onSave: () => void
  onClose: () => void
  onTerrain: () => void
  onSpot: (spot: ScenicSpot) => void
}
export default function Drawer({ spot,route,location,saved,onSave,onClose,onTerrain,onSpot }:Props) {
  const [expanded,setExpanded]=useState(false)
  const [photoIndex,setPhotoIndex]=useState(0)
  const scroll=useRef<HTMLDivElement>(null)
  const close=useRef<HTMLButtonElement>(null)
  const touch=useRef<{y:number; atTop:boolean}|null>(null)
  const opener=useRef(document.activeElement)
  useEffect(() => {
    close.current?.focus({preventScroll:true})
    const trigger=opener.current
    return () => { if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({preventScroll:true}) }
  },[])
  const name=spot?.name??route!.name
  const photo=spot?.images[photoIndex]??(route ? getPhoto(route.image) : undefined)
  const coordinates=spot?.entranceCoordinates??spot?.navigationCoordinates??(route ? route.geometry[0] : undefined)
  const targetName=spot?.entranceName??spot?.navigationName??route?.start
  const locationDistance=spot && location ? distance(location.point,[spot.longitude,spot.latitude]) : null
  return <aside role="dialog" aria-labelledby="drawer-title" className={`drawer ${expanded?'is-expanded':''}`}>
    <div className="drawer-handle-row"
      onTouchStart={event => {touch.current={y:event.touches[0].clientY,atTop:true}}}
      onTouchEnd={event => {
        if (!touch.current) return
        const delta=event.changedTouches[0].clientY-touch.current.y
        if (delta < -28) setExpanded(true)
        if (delta > 28) setExpanded(false)
        touch.current=null
      }}>
      <button className="drawer-handle" onClick={() => setExpanded(!expanded)} aria-label={expanded?'收起详情':'展开详情'} aria-expanded={expanded}><span/></button>
      <button ref={close} onClick={onClose} aria-label="关闭详情" className="icon-button drawer-close"><X size={20}/></button>
    </div>
    <div className="drawer-scroll" ref={scroll}
      onTouchStart={event => {touch.current={y:event.touches[0].clientY,atTop:(scroll.current?.scrollTop??0)<2}}}
      onTouchEnd={event => {
        if (!touch.current) return
        const delta=event.changedTouches[0].clientY-touch.current.y
        if (delta < -42 && !expanded) setExpanded(true)
        if (delta > 60 && touch.current.atTop && expanded) setExpanded(false)
        touch.current=null
      }}>
      <div className="drawer-summary">
        {photo && <div className="drawer-thumb"><PhotoFrame photo={photo} alt={name} sizes="120px" eager/></div>}
        <div className="drawer-intro">
          <span className="drawer-category">{spot?.category??route?.difficulty}</span>
          <h2 id="drawer-title">{name}</h2>
          <p>{spot ? spot.englishName : route?.title}</p>
          <Visit minutes={spot?.estimatedVisitMinutes??route!.minutes}/>
        </div>
        {spot && <button className="icon-button save-spot" aria-label={saved?'取消收藏':'收藏景点'} aria-pressed={saved} onClick={onSave}>
          <Bookmark size={19} fill={saved?'currentColor':'none'}/>
        </button>}
      </div>
      <div className="drawer-preview"><p>{spot?.description??route?.description}</p>
        <button className="text-link detail-toggle" onClick={() => setExpanded(!expanded)}>{expanded?'收起':'展开详情'}<ChevronDown size={16} className={expanded?'turned':''}/></button>
      </div>
      {expanded && <div className="drawer-body">
        {photo && <figure>
          <div className="detail-photo">
            <PhotoFrame photo={photo} alt={name} sizes="(max-width: 700px) 100vw, 470px" eager/>
            {spot && spot.images.length>1 && <div className="gallery-buttons">
              <button className="icon-button" aria-label="上一张图片" onClick={() => setPhotoIndex((photoIndex+spot.images.length-1)%spot.images.length)}><ChevronLeft size={16}/></button>
              <span>{photoIndex+1} / {spot.images.length}</span>
              <button className="icon-button" aria-label="下一张图片" onClick={() => setPhotoIndex((photoIndex+1)%spot.images.length)}><ChevronRight size={16}/></button>
            </div>}
          </div>
          <figcaption><Credit photo={photo}/></figcaption>
        </figure>}
        {spot ? <>
          <h3>在这里看什么</h3>
          <ul className="detail-list">{spot.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
          <h3>怎么到达</h3><p>{spot.approach}</p>
          <p>{spot.ticketInfo}</p>
          <p className="detail-date">资料查阅于 {spot.lastVerified} · <a href={guide} target="_blank" rel="noreferrer">官方运营指南</a></p>
          <div className="detail-data"><MapPin size={16}/><div>{spot.coordinateRole} · {spot.latitude.toFixed(5)}°N {spot.longitude.toFixed(5)}°E<br/><small>DEM 采样约 {spot.elevation} 米 {locationDistance!==null && ` · 距你直线约 ${locationText(locationDistance)}`}</small></div></div>
          <div className="detail-sources"><External href={spot.officialUrl}>官方详情</External><External href={spot.coordinatesSource}>点位来源</External>{spot.entranceSource && <External href={spot.entranceSource}>入口来源</External>}{spot.navigationSource && <External href={spot.navigationSource}>到达点来源</External>}</div>
        </> : route && <>
          <h3>沿途与终点</h3><p>{route.start}至{route.end}。{route.note}</p>
          <p>{route.audience} · 步行 {route.meters.toLocaleString()} 米 · 约爬升 {route.ascent} 米</p>
          <div className="spot-chips">{route.visits.map(id => {
            const item=spotById[id as keyof typeof spotById]
            return <SpotChip key={id} onClick={() => onSpot(item)}>{item.shortName??item.name}</SpotChip>
          })}</div><External href={route.source}>官方道路或景区资料</External>
        </>}
      </div>}
    </div>
    <div className="drawer-footer">
      <button className="button primary" onClick={onTerrain}><Compass size={17}/>{route?'查看山上线路':'查看在山上的位置'}</button>
      {coordinates ? <a className="button secondary" href={mapLink(coordinates,targetName??name)} target="_blank" rel="noreferrer"><Navigation size={16}/>导航至{route?'起点':spot?.id==='sun'?'博爱坊':spot?.entranceCoordinates?'入口':'到达点'}</a> :
        <a className="button secondary" href={`https://uri.amap.com/search?keyword=${encodeURIComponent(name)}&city=南京&callnative=1`} target="_blank" rel="noreferrer"><ExternalLink size={15}/>在高德搜索</a>}
    </div>
  </aside>
}
