import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Building2, Clock3, Compass, Footprints, Layers3, LocateFixed, Map, MapPin, Minus, Mountain, Plus, RotateCcw, SlidersHorizontal, TrainFront, Trees, X } from 'lucide-react'
import { categories, featuredSpots, guide, official, routes, spots, spotById, travel, verifiedDate, type Category, type ScenicRoute, type ScenicSpot } from './data'
import { asset, distance, inside, locationText, type LocationFix } from './geo'
import type { ViewerProps } from './viewer'
import { Brand, Credit, External, getPhoto, PhotoFrame, SectionHeading, Visit } from './ui'
import Drawer from './Drawer'

const TerrainViewer=lazy(() => import('./TerrainViewer'))
const FlatMap=lazy(() => import('./FlatMap'))
type Mode='terrain'|'map'
const filters=['全部',...categories] as const
const travelIcons=[TrainFront,Building2,Map,Footprints]
const readSaved = () => {
  try {
    const value:unknown=JSON.parse(localStorage.getItem('purple-mountain-saved')??'[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id==='string') : []
  } catch { return [] }
}
const navigateTo = (id:string) => {
  document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})
}
const meters = (n:number) => n>=1000?`${(n/1000).toFixed(2)} 公里`:`${n} 米`

function App() {
  const [mode,setMode]=useState<Mode>('terrain')
  const [unsupported,setUnsupported]=useState(false)
  const [filter,setFilter]=useState<(typeof filters)[number]>('全部')
  const [selected,setSelected]=useState<ScenicSpot|null>(null)
  const [activeRoute,setActiveRoute]=useState<ScenicRoute|null>(null)
  const [drawer,setDrawer]=useState<'spot'|'route'|null>(null)
  const [command,setCommand]=useState<ViewerProps['command']>({serial:0,action:'reset'})
  const [saved,setSaved]=useState<string[]>(readSaved)
  const [showSaved,setShowSaved]=useState(false)
  const [filterOpen,setFilterOpen]=useState(false)
  const [fix,setFix]=useState<LocationFix|null>(null)
  const [geoStatus,setGeoStatus]=useState('')
  const [geolocating,setGeolocating]=useState(false)
  const [creditOpen,setCreditOpen]=useState(false)
  const viewport=useRef<HTMLDivElement>(null)
  const rail=useRef<HTMLDivElement>(null)
  const closest=useMemo(() => fix ? [...spots].sort((a,b) =>
    distance(fix.point,a.entranceCoordinates??a.navigationCoordinates??[a.longitude,a.latitude]) -
    distance(fix.point,b.entranceCoordinates??b.navigationCoordinates??[b.longitude,b.latitude]))[0] : null,[fix])
  const visibleSpots=useMemo(() => filter==='全部'?spots:spots.filter(spot => spot.category===filter),[filter])
  const issue=(action:ViewerProps['command']['action']) => setCommand(current => ({serial:current.serial+1,action}))
  const choose=(spot:ScenicSpot,scroll=false) => {
    if (filter!=='全部' && filter!==spot.category) setFilter('全部')
    setSelected(spot)
    setActiveRoute(null)
    setDrawer('spot')
    setShowSaved(false)
    issue('focus')
    if (scroll) navigateTo('atlas')
  }
  const clear=() => {
    setDrawer(null)
    setSelected(null)
  }
  const chooseRoute=(route:ScenicRoute) => {
    setSelected(null)
    setActiveRoute(route)
    setDrawer('route')
    setFilter('全部')
    issue('route')
    navigateTo('atlas')
  }
  const showOnTerrain=() => {
    if (!unsupported) setMode('terrain')
    setDrawer(null)
    issue(drawer==='route'?'route':'focus')
    navigateTo('atlas')
  }
  const reset=() => {
    clear()
    setActiveRoute(null)
    issue('reset')
  }
  const switchMode=(next:Mode) => {
    setMode(next)
    issue(selected?'focus':activeRoute?'route':fix && inside(fix.point)?'locate':'reset')
  }
  const filterSpots=(next:Category|'全部') => {
    setFilter(next)
    if (selected && next!=='全部' && next!==selected.category) clear()
    if (next!=='全部') issue('reset')
  }
  const toggle=(id:string) => setSaved(ids => ids.includes(id)?ids.filter(x => x!==id):[...ids,id])
  const locate=() => {
    if (!navigator.geolocation) { setGeoStatus('当前浏览器无法定位。'); return }
    if (fix) {
      setFix(null)
      setGeoStatus('')
      return
    }
    setGeolocating(true)
    setGeoStatus('正在获取位置…')
    navigator.geolocation.getCurrentPosition(position => {
      const result:LocationFix={point:[position.coords.longitude,position.coords.latitude],accuracy:position.coords.accuracy}
      setFix(result)
      setGeoStatus(inside(result.point)?'已定位':'当前位置在地图范围外')
      setGeolocating(false)
      if (inside(result.point)) issue('locate')
    },error => {
      setGeoStatus(error.code===1?'未获定位权限，仍可浏览地图。':'定位暂不可用，可稍后重试。')
      setGeolocating(false)
    },{enableHighAccuracy:false,maximumAge:0,timeout:12000})
  }
  useEffect(() => { try { localStorage.setItem('purple-mountain-saved',JSON.stringify(saved)) } catch { /* Private storage can be disabled. */ } },[saved])
  useEffect(() => {
    const key=(event:KeyboardEvent) => {
      if (event.key!=='Escape') return
      if (drawer) clear()
      else if (showSaved) setShowSaved(false)
      else setFilterOpen(false)
    }
    document.addEventListener('keydown',key)
    return () => document.removeEventListener('keydown',key)
  },[drawer,showSaved])
  const viewerProps:ViewerProps={ visibleSpots,selected,activeRoute,location:fix,command,onSelect:choose,onClear:clear }
  const zoom=(delta:number) => viewport.current?.dispatchEvent(new CustomEvent('atlas-zoom',{detail:delta}))
  const storyPhoto=getPhoto('mountain-1')
  const listed=filter==='全部' ? featuredSpots.map(id => spotById[id as keyof typeof spotById]).concat(spots.filter(spot=>!featuredSpots.includes(spot.id))) : visibleSpots

  return <>
    <a className="skip-link" href="#atlas">跳至互动地图</a>
    <header id="top" className="site-header">
      <div className="shell header-inner">
        <Brand/>
        <nav className="header-nav" aria-label="站点导航">
          <a href="#stories">山上故事</a><a href="#places">探索景点</a><a href="#routes">推荐路线</a><a href="#travel">出行指南</a>
        </nav>
        <div className="header-save">
          <button className="bookmark-button" aria-expanded={showSaved} onClick={() => setShowSaved(!showSaved)}>
            <Bookmark size={17}/><span>我的收藏</span>{saved.length>0 && <b>{saved.length}</b>}
          </button>
          {showSaved && <div className="saved-menu" role="region" aria-label="我的收藏">
            <div><h3>我的收藏</h3><button className="icon-button" onClick={() => setShowSaved(false)} aria-label="关闭收藏"><X size={17}/></button></div>
            {saved.length ? saved.map(id => spots.find(spot=>spot.id===id)).filter((spot):spot is ScenicSpot=>!!spot).map(spot =>
              <button key={spot.id} className="saved-item" onClick={() => choose(spot,true)}><MapPin size={16}/>{spot.name}<ArrowUpRight size={14}/></button>
            ) : <p>收藏感兴趣的景点，下次从这里继续。</p>}
          </div>}
        </div>
      </div>
    </header>
    <main>
      <section className="shell hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-kicker"><span/>南京 · 钟山风景名胜区</div>
          <h1 id="hero-title">山有万重，<br/>金陵在其中。</h1>
          <p className="hero-english">Purple Mountain Explorer</p>
          <p className="hero-subtitle">以一座山，认识一座城。</p>
          <div className="hero-actions">
            <a className="button primary" href="#places">探索景点</a>
            <a className="button secondary" href="#routes">推荐路线</a>
          </div>
          <div className="hero-coordinates"><span><Compass size={15}/> 32°04′ N &nbsp; 118°50′ E</span><span>南京 · 中国</span></div>
        </div>

        <div className="atlas" id="atlas">
          <div className="atlas-stage" ref={viewport} aria-label="互动紫金山地图">
            <Suspense fallback={<div className="loading-atlas" role="status">正在加载地图…</div>}>
              {mode==='terrain' ? <TerrainViewer {...viewerProps} onError={() => { setUnsupported(true); setMode('map') }}/> : <FlatMap {...viewerProps}/>}
            </Suspense>
            <div className="map-tabs" aria-label="地图模式">
              <button type="button" className={mode==='terrain'?'active':''} aria-pressed={mode==='terrain'} disabled={unsupported} onClick={() => switchMode('terrain')}><Layers3 size={16}/>三维沙盘</button>
              <button type="button" className={mode==='map'?'active':''} aria-pressed={mode==='map'} onClick={() => switchMode('map')}><Map size={16}/>二维地图</button>
            </div>
            <div className="map-controls" aria-label="地图工具">
              <button className="icon-button" aria-label="筛选景点" aria-expanded={filterOpen} data-active={filter!=='全部'} onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={17}/></button>
              <button className="icon-button" aria-label={fix?'清除我的位置':'获取我的位置'} disabled={geolocating} data-active={!!fix} onClick={locate}><LocateFixed size={19}/></button>
              <div className="zoom-stack">
                <button className="icon-button" aria-label="放大" onClick={() => zoom(1.26)}><Plus size={19}/></button>
                <button className="icon-button" aria-label="缩小" onClick={() => zoom(1/1.26)}><Minus size={19}/></button>
              </div>
              <button className="icon-button" aria-label="恢复默认视角" onClick={reset}><RotateCcw size={17}/></button>
            </div>
            {filterOpen && <div className="map-filter" aria-label="景点类型">
              {filters.map(name => <button key={name} aria-pressed={filter===name} onClick={() => {filterSpots(name);setFilterOpen(false)}}>{name}</button>)}
            </div>}
            {(activeRoute || geoStatus || unsupported) && <div className="map-status" aria-live="polite">
              {activeRoute && <button onClick={() => setDrawer('route')}><Footprints size={15}/>{activeRoute.title}</button>}
              {geoStatus && <p>{geoStatus}{fix && closest && <> · <button onClick={() => choose(closest)}>附近景点 {closest.shortName??closest.name}</button> <span>{locationText(distance(fix.point,closest.entranceCoordinates??closest.navigationCoordinates??[closest.longitude,closest.latitude]))}（直线）</span></>}</p>}
              {unsupported && <p>当前设备使用二维地图</p>}
            </div>}
            <div className="map-caption">{mode==='terrain'?'WGS84 · 高程夸张 2.8×':'WGS84 · 空心点为游客入口'}</div>
          </div>
          <div className="atlas-footer">
            <p><span className="instruction-icon">{mode==='terrain'?<RotateCcw size={14}/>:<MapPin size={14}/>}</span>
              {mode==='terrain'?'拖动山体，发现隐藏在林间的故事':'拖动地图，查看道路、入口与景点'}</p>
            <div className="atlas-sources"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a><span> / </span><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">Mapzen DEM</a></div>
          </div>
        </div>
      </section>

      <section className="story-wrap" id="stories">
        <div className="shell story">
          <figure className="story-image"><PhotoFrame photo={storyPhoto} alt="自玄武湖畔远望紫金山山脊" sizes="(max-width: 760px) 90vw, 680px"/><figcaption>玄武湖畔远望钟山{storyPhoto && <> <Credit photo={storyPhoto}/></>}</figcaption></figure>
          <div className="story-copy">
            <SectionHeading english="Stories of the mountain" title="山上的故事"/>
            <p>从玄武湖望去，紫金山的山脊在南京城东缓缓展开。顺着山势往南，明孝陵的神道隐入密林，中山陵的石阶沿坡向上。西峰上，天文台的圆顶越过树梢。</p>
            <p>山里有古迹，也有今天南京人的散步、赏花与登高。沿着一条路走下去，常常能在几分钟内走进另一段历史。</p>
            <External href={guide}>钟山风景名胜区官方导览</External>
          </div>
        </div>
      </section>

      <section className="shell content-section" id="places">
        <SectionHeading english="Places to discover" title="探索景点">
          <div className="carousel-controls">
            <button className="icon-button" aria-label="上一组景点" onClick={() => rail.current?.scrollBy({left:-rail.current.clientWidth*.72,behavior:'smooth'})}><ArrowLeft size={18}/></button>
            <button className="icon-button" aria-label="下一组景点" onClick={() => rail.current?.scrollBy({left:rail.current.clientWidth*.72,behavior:'smooth'})}><ArrowRight size={18}/></button>
          </div>
        </SectionHeading>
        <div className="category-row" aria-label="按类型浏览景点">
          {filters.map(name => <button key={name} className={name===filter?'active':''} aria-pressed={name===filter} onClick={() => { filterSpots(name); rail.current?.scrollTo(0,0) }}>{name}</button>)}
        </div>
        <div ref={rail} className="spot-rail">
          {listed.map(spot => <button className="spot-card" data-card={spot.id} key={spot.id} onClick={() => choose(spot,true)}>
            <div className="spot-image"><PhotoFrame photo={spot.images[0]} alt={spot.name}/><span>{spot.category}</span></div>
            <div className="spot-card-copy">
              <div className="spot-card-title"><h3>{spot.shortName??spot.name}</h3><ArrowUpRight size={21}/></div>
              <p>{spot.description.split('。')[0]}。</p>
              <Visit minutes={spot.estimatedVisitMinutes}/>
            </div>
          </button>)}
        </div>
      </section>

      <section id="routes" className="routes-wrap">
        <div className="shell content-section">
          <SectionHeading english="Walk the mountain" title="推荐路线"><p className="section-note">三种步调，沿开放道路与步道游览。</p></SectionHeading>
          <div className="route-grid">
            {routes.map((route,index) => <article key={route.id} className="route-card">
              <div className="route-image"><PhotoFrame photo={getPhoto(route.image)} alt={route.imageAlt}/><span>{route.difficulty}</span></div>
              <div className="route-copy">
                <div className="route-kicker">{index===0?<Mountain size={16}/>:index===1?<Building2 size={16}/>:<Trees size={16}/>}<span>{route.englishName}</span></div>
                <h3>{route.name}</h3><p className="route-title">{route.title}</p><p>{route.description}</p>
                <div className="route-stats"><span><Footprints size={15}/>{meters(route.meters)}</span><span><Clock3 size={15}/>约 {route.minutes} 分钟</span><span><Mountain size={15}/>↑ {route.ascent} 米</span></div>
                <button className="route-link" data-route={route.id} onClick={() => chooseRoute(route)}>查看路线<ArrowUpRight size={19}/></button>
              </div>
            </article>)}
          </div>
          <p className="route-method">步行时间按实际路径长度与 DEM 爬升估算。景点参观、等候及返程时间另计。</p>
        </div>
      </section>

      <section id="travel" className="shell content-section travel-section">
        <SectionHeading english="Before you go" title="出行指南"><p className="section-note">官方资料查阅于 {verifiedDate}</p></SectionHeading>
        <div className="travel-grid">
          {travel.map((item,index) => {
            const Icon=travelIcons[index]
            return <details key={item.title} className="travel-item">
              <summary><Icon size={19}/><span>{item.title}</span><Plus size={17} className="travel-plus"/></summary>
              <p>{item.text}</p><External href={item.link}>{item.label}</External>
            </details>
          })}
        </div>
      </section>
    </main>
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main"><Brand/><div><a href={official+'/lyzx/'} target="_blank" rel="noreferrer">官方公告</a><button onClick={() => setCreditOpen(!creditOpen)} aria-expanded={creditOpen}>数据与图片署名</button><a href="#top">回到顶部 ↑</a></div></div>
        <div className="footer-caption"><span>紫金山 · 掌上山野</span><span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap 贡献者</a> · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Mapzen / Tilezen 地形</a></span></div>
        {creditOpen && <div className="credits-panel"><p>照片经尺寸调整和 WebP 压缩，按各文件原始许可分发。高程源包括 SRTM，地图数据采用 ODbL。</p>
          {[storyPhoto,...spots.flatMap(spot=>spot.images)].filter((photo):photo is NonNullable<typeof photo>=>!!photo).map(photo=>
            <div key={photo.id}><span>{photo.title}</span><Credit photo={photo}/></div>
          )}
        </div>}
      </div>
    </footer>
    {(drawer==='spot' && selected || drawer==='route' && activeRoute) && <Drawer
      key={drawer==='spot'?selected?.id:activeRoute?.id}
      spot={drawer==='spot'?selected??undefined:undefined}
      route={drawer==='route'?activeRoute??undefined:undefined}
      location={fix} saved={!!selected && saved.includes(selected.id)} onSave={() => selected && toggle(selected.id)}
      onClose={clear} onTerrain={showOnTerrain} onSpot={spot=>choose(spot,true)}/>}
  </>
}
export default App
