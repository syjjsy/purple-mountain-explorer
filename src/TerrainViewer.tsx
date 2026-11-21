import { useEffect, useRef, useState } from 'react'
import { Compass } from 'lucide-react'
import * as T from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Coordinate, ScenicSpot } from './data'
import { spots } from './data'
import { inside, loadMap, loadTerrain, sceneWidth } from './geo'
import { landmark, makeTerrain, place } from './terrain-model'
import type { ViewerProps } from './viewer'

interface Marker { spot: ScenicSpot; position:T.Vector3; button: HTMLButtonElement }
const heroLabels = new Set(['sun','ming','ridge','observatory','linggu','palace'])
const landmarkIds = ['sun','ming','observatory','palace','tower','music']
const point = (spot: ScenicSpot): Coordinate => [spot.longitude,spot.latitude]
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function dispose(root: T.Object3D, exceptions = new Set<T.Material>()) {
  root.traverse(object => {
    if (!(object instanceof T.Mesh || object instanceof T.Line)) return
    object.geometry.dispose()
    const materials: T.Material[] = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => {
      if (!exceptions.has(material)) {
        const map = (material as T.MeshBasicMaterial).map
        map?.dispose()
        material.dispose()
      }
    })
  })
}

export default function TerrainViewer(props: ViewerProps & { onError: () => void }) {
  const wrapper = useRef<HTMLDivElement>(null)
  const compass = useRef<HTMLDivElement>(null)
  const buttons = useRef<Record<string,HTMLButtonElement | null>>({})
  const controller = useRef<((props: ViewerProps) => void) | undefined>(undefined)
  const latest = useRef(props)
  latest.current = props
  const [status,setStatus] = useState('正在加载真实高程…')

  useEffect(() => {
    const element = wrapper.current
    if (!element) return
    let canceled = false
    let clean: (() => void) | undefined
    Promise.all([loadTerrain(),loadMap()]).then(([terrain,map]) => {
      if (canceled) return
      const compact = window.matchMedia('(max-width: 700px)').matches
      const scene = new T.Scene()
      const camera = new T.OrthographicCamera(-5,5,3,-3,.1,100)
      const direction = new T.Vector3(compact ? 1.85 : 2.35, compact ? 8.65 : 7.1, 10)
      const defaultTarget = new T.Vector3(0,.12,0)
      camera.position.copy(direction).add(defaultTarget)
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact ? 1.4 : 1.75))
      renderer.setClearColor(0x000000,0)
      renderer.domElement.className = 'terrain-canvas'
      renderer.domElement.setAttribute('aria-label','可旋转的紫金山真实高程三维模型')
      element.prepend(renderer.domElement)

      const controls = new OrbitControls(camera,renderer.domElement)
      controls.target.copy(defaultTarget)
      controls.enablePan = false
      controls.enableDamping = !reducedMotion()
      controls.dampingFactor = .14
      controls.minPolarAngle = .3
      controls.maxPolarAngle = 1.23
      controls.minZoom = .76
      controls.maxZoom = 3.3
      controls.rotateSpeed = .78
      // Leave mouse wheel scrolling to the page. Pinch and explicit zoom buttons remain available.
      const wheel = (event: WheelEvent) => { if (!event.ctrlKey) event.stopImmediatePropagation() }
      renderer.domElement.addEventListener('wheel',wheel,{capture:true,passive:true})
      controls.update()
      scene.add(new T.HemisphereLight(0xf1f3e6,0xada28c,1.74))
      const sunlight = new T.DirectionalLight(0xfff5e1,1.56)
      sunlight.position.set(-5,9,2)
      scene.add(sunlight)
      scene.add(new T.AmbientLight(0xffffff,.19))

      const model = makeTerrain(terrain,map,compact)
      scene.add(model)
      const buildings = new T.Group()
      const materials = new Set<T.Material>()
      for (const id of landmarkIds) {
        const spot = spots.find(spot => spot.id===id)!
        const building = landmark(id)
        const coordinate: Coordinate = point(spot)
        building.position.copy(place(terrain,coordinate,.003))
        building.rotation.y = -.11
        building.traverse(object => {
          if (object instanceof T.Mesh) materials.add(object.material as T.Material)
        })
        buildings.add(building)
      }
      model.add(buildings)
      const markers: Marker[] = spots.map(spot => ({
        spot, position: place(terrain,point(spot),landmarkIds.includes(spot.id) ? .19 : .05),
        button:buttons.current[spot.id]!,
      }))
      const routeGroup = new T.Group()
      model.add(routeGroup)
      const fix = new T.Mesh(new T.SphereGeometry(.045,12,8),new T.MeshBasicMaterial({ color: '#286bef' }))
      model.add(fix)
      fix.visible = false
      let activeRoute: ViewerProps['activeRoute'] = null
      let current: ViewerProps = latest.current
      let lastCommand = -1
      let raf = 0, idle = 0, visible = true
      let width = 0, height = 0
      const start = performance.now()
      const animateEntrance = !reducedMotion()
      let drawn = 0
      let tween: { t: number; position: T.Vector3; target:T.Vector3; zoom:number; fromPos:T.Vector3; fromTarget:T.Vector3; fromZoom:number } | undefined
      const projected = new T.Vector3()
      const north = new T.Vector3()
      const middle = new T.Vector3()
      const labelCandidates: { marker: Marker; x: number; y:number; rank:number }[] = []
      const resize = () => {
        width = element.clientWidth
        height = element.clientHeight
        if (!width || !height) return
        const aspect = width/height
        const view = Math.max(sceneWidth*(compact ? 1.23 : 1.30)/aspect,5.35)
        camera.left = -view*aspect/2
        camera.right = view*aspect/2
        camera.top = view/2
        camera.bottom = -view/2
        camera.updateProjectionMatrix()
        renderer.setSize(width,height,false)
        requestDraw()
      }
      function requestDraw() {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
      }
      function draw(now:number) {
        raf = 0
        if (!visible || document.hidden || !width || !height) return
        const progress = animateEntrance ? Math.min(1,(now-start)/860) : 1
        model.position.y = -.32*(1-progress)**3
        if (tween) {
          const portion = reducedMotion() ? 1 : Math.min(1,(now-tween.t)/700)
          const ease = 1-(1-portion)**3
          camera.position.lerpVectors(tween.fromPos,tween.position,ease)
          controls.target.lerpVectors(tween.fromTarget,tween.target,ease)
          camera.zoom = T.MathUtils.lerp(tween.fromZoom,tween.zoom,ease)
          camera.updateProjectionMatrix()
          if (portion===1) tween=undefined
        }
        const moving = controls.update()
        const line = routeGroup.children[0] as Line2 | undefined
        if (line && drawn < 1) {
          drawn = reducedMotion() ? 1 : Math.min(1,drawn+.047)
          line.geometry.instanceCount = Math.ceil(line.geometry.attributes.instanceStart.count*drawn)
        }
        renderer.render(scene,camera)

        const allowed = new Set(current.visibleSpots.map(spot => spot.id))
        const markerPixels: [number,number][] = []
        labelCandidates.length = 0
        for (const marker of markers) {
          const {button,spot,position} = marker
          projected.copy(position)
          projected.y += model.position.y
          projected.project(camera)
          const x = (projected.x+1)*width/2, y=(1-projected.y)*height/2
          const visibleMarker = allowed.has(spot.id) && x>14 && x<width-14 && y>44 && y<height-27
          button.hidden = !visibleMarker
          if (!visibleMarker) continue
          markerPixels.push([x,y])
          button.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0) translate(-50%,-50%)`
          const selected = current.selected?.id===spot.id
          button.style.opacity = String(Math.max(0,(progress-.10)/.90))
          button.classList.toggle('is-selected',selected)
          button.classList.remove('has-label')
          const showLabel = selected || heroLabels.has(spot.id) || current.visibleSpots.length<spots.length || camera.zoom>1.72
          if (showLabel) labelCandidates.push({marker,x,y,rank:selected?0:spot.id==='ridge'?1:spot.id==='sun'?2:3})
        }
        labelCandidates.sort((a,b) => a.rank-b.rank)
        const occupied: { x:number; y:number; w:number }[] = []
        for (const {marker,x,y,rank} of labelCandidates) {
          const w = (marker.spot.shortName??marker.spot.name).length*(compact?10:12)+15
          const offsets = [[0,-22],[0,21],[-w/2-11,0],[w/2+11,0],[-12,-26],[12,25]]
          const offset = offsets.find(([dx,dy]) => {
            const cx=x+dx, cy=y+dy
            if (cx-w/2 < 6 || cx+w/2 > width-(compact?43:50) || cy<57 || cy>height-29) return false
            if (markerPixels.some(([px,py]) => Math.abs(py-cy)<13 && Math.abs(px-cx)<w/2+4)) return false
            return !occupied.some(label => Math.abs(label.y-cy)<23 && Math.abs(label.x-cx)<(w+label.w)/2+4)
          }) ?? (rank<3 ? [0,-22] : undefined)
          if (offset) {
            const [dx,dy]=offset
            marker.button.style.setProperty('--label-x',`${dx}px`)
            marker.button.style.setProperty('--label-y',`${dy}px`)
            marker.button.classList.add('has-label')
            occupied.push({x:x+dx,y:y+dy,w})
          }
        }
        if (compass.current) {
          north.set(0,0,-1).project(camera)
          middle.set(0,0,0).project(camera)
          const angle = Math.atan2((north.x-middle.x)*width,(north.y-middle.y)*height)
          compass.current.style.setProperty('--bearing',`${angle}rad`)
        }
        idle = moving ? 8 : Math.max(0,idle-1)
        if (progress<1 || tween || idle || (line && drawn<1)) requestDraw()
      }
      function go(target:T.Vector3, zoom:number, offset=direction) {
        tween = { t:performance.now(), target, position:target.clone().add(offset), zoom,
          fromPos: camera.position.clone(), fromTarget: controls.target.clone(), fromZoom:camera.zoom }
        requestDraw()
      }
      const refresh = (next: ViewerProps) => {
        current = next
        if (activeRoute !== next.activeRoute) {
          dispose(routeGroup)
          routeGroup.clear()
          activeRoute = next.activeRoute
          if (activeRoute) {
            const vertices = activeRoute.geometry.flatMap((p,i,arr) => {
              if (!i) return [place(terrain,p,.025)]
              const a = arr[i-1]
              const steps = Math.max(1, Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/.00012))
              return Array.from({length:steps},(_,j) => place(terrain,[
                T.MathUtils.lerp(a[0],p[0],(j+1)/steps), T.MathUtils.lerp(a[1],p[1],(j+1)/steps),
              ],.032))
            })
            const geometry = new LineGeometry().setPositions(vertices.flatMap(vertex => vertex.toArray()))
            const material = new LineMaterial({ color:'#f9c879', linewidth:3.5, depthTest:false, transparent:true, opacity:.95 })
            routeGroup.add(new Line2(geometry,material))
            drawn = 0
          }
        }
        fix.visible = !!next.location && inside(next.location.point)
        if (fix.visible && next.location) fix.position.copy(place(terrain,next.location.point,.07))
        if (next.command.serial!==lastCommand) {
          lastCommand = next.command.serial
          if (next.command.action==='focus' && next.selected) {
            go(place(terrain,point(next.selected),.04),compact ? 1.68 : 1.8,new T.Vector3(3.05,8.5,9.25))
          } else if (next.command.action==='route' && activeRoute) {
            const vertices=activeRoute.geometry
            const first=vertices[0], last=vertices[vertices.length-1]
            go(place(terrain,[(first[0]+last[0])/2,(first[1]+last[1])/2]),1.7,new T.Vector3(1,9.1,8.65))
          } else if (next.command.action==='locate' && next.location && inside(next.location.point)) {
            go(place(terrain,next.location.point),1.8)
          } else if (next.command.action==='reset') {
            go(defaultTarget.clone(),1)
          }
        }
        requestDraw()
      }

      let down:{x:number;y:number}|null = null
      let multiTouch = false
      const pointers = new Set<number>()
      const canvas = renderer.domElement
      canvas.addEventListener('pointerdown',event => {
        pointers.add(event.pointerId)
        if (pointers.size>1) multiTouch=true
        down = {x:event.clientX,y:event.clientY}
        tween=undefined
        requestDraw()
      })
      canvas.addEventListener('pointerup',event => {
        pointers.delete(event.pointerId)
        if (!multiTouch && down && Math.hypot(event.clientX-down.x,event.clientY-down.y)<6) {
          if (event.detail===2) go(defaultTarget.clone(),1)
          latest.current.onClear()
        }
        if (!pointers.size) { down=null; multiTouch=false }
      })
      canvas.addEventListener('pointercancel',event => {
        pointers.delete(event.pointerId)
        if (!pointers.size) { down=null; multiTouch=false }
      })
      canvas.addEventListener('dblclick',() => go(defaultTarget.clone(),1))
      canvas.addEventListener('webglcontextlost',event => {
        event.preventDefault()
        latest.current.onError()
      })
      const zoom = (event:Event) => {
        const delta = (event as CustomEvent<number>).detail
        go(controls.target.clone(),T.MathUtils.clamp(camera.zoom*delta,controls.minZoom,controls.maxZoom),camera.position.clone().sub(controls.target))
      }
      const parent = element.parentElement!
      parent.addEventListener('atlas-zoom',zoom)
      const ro = new ResizeObserver(resize)
      ro.observe(element)
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        if (visible) requestDraw()
      })
      io.observe(element)
      controls.addEventListener('change',requestDraw)
      document.addEventListener('visibilitychange',requestDraw)
      clean = () => {
        ro.disconnect()
        io.disconnect()
        document.removeEventListener('visibilitychange',requestDraw)
        parent.removeEventListener('atlas-zoom',zoom)
        cancelAnimationFrame(raf)
        controls.dispose()
        dispose(scene,materials)
        renderer.dispose()
        canvas.remove()
      }
      controller.current = refresh
      resize()
      refresh(latest.current)
      setStatus('')
    }).catch(error => {
      if (!canceled) {
        console.warn('三维地形不可用',error)
        latest.current.onError()
      }
    })
    return () => { canceled=true; controller.current=undefined; clean?.() }
  },[])
  useEffect(() => controller.current?.(props),[props])

  return <div ref={wrapper} className="terrain-layer" data-viewer="terrain">
    <div className="terrain-markers">
      {spots.map(spot => <button key={spot.id} type="button" hidden
        ref={node => { buttons.current[spot.id]=node }}
        aria-label={spot.name} aria-pressed={props.selected?.id===spot.id}
        data-spot={spot.id} className="terrain-marker" onClick={() => props.onSelect(spot)}>
        <span className="terrain-dot"/><span className="terrain-label">{spot.shortName??spot.name}</span>
      </button>)}
    </div>
    <div className="compass" ref={compass} aria-label="北方指示"><span>N</span><Compass size={29} strokeWidth={1.25}/><i/></div>
    {status && <div className="loading-atlas" role="status">{status}</div>}
  </div>
}
