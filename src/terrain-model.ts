import * as T from 'three'
import type { Coordinate } from './data'
import { bounds, elevation, fromLocal, sceneDepth, sceneWidth, toLocal, worldHeight, type MapData, type TerrainData } from './geo'

function texture(data: TerrainData, map: MapData) {
  const canvas = document.createElement('canvas')
  const width = 1024, height = 720
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  const forest = document.createElement('canvas')
  forest.width = width
  forest.height = height
  const mask = forest.getContext('2d', { willReadFrequently: true })!
  function plot(target: CanvasRenderingContext2D, path: Coordinate[]) {
    target.beginPath()
    path.forEach(([lon,lat], index) => {
      const x = (lon-bounds.west)/(bounds.east-bounds.west)*width
      const y = (bounds.north-lat)/(bounds.north-bounds.south)*height
      if (index === 0) target.moveTo(x,y)
      else target.lineTo(x,y)
    })
  }
  for (const { geometry, properties } of map.features) {
    if (geometry.type === 'Polygon' && properties.kind === 'forest') {
      plot(mask,geometry.coordinates[0])
      mask.fill()
    }
  }
  const coverage = mask.getImageData(0,0,width,height).data
  const raster = context.createImageData(width,height)
  for (let y=0; y<height; y++) {
    const lat = bounds.north - y/(height-1)*(bounds.north-bounds.south)
    for (let x=0; x<width; x++) {
      const lon = bounds.west+x/(width-1)*(bounds.east-bounds.west)
      const h = elevation(data,[lon,lat])
      const index = (y*width+x)*4
      const wood = coverage[index+3] / 255
      const relief = Math.min(1, Math.max(0, (h-48)/180))
      const cover = Math.min(1, Math.max(wood*.66,relief*.91))
      const grain = (((x*77 ^ y*193 ^ (x*y*13)) & 31) - 15) * .37
      const band = h>35 && (h+1)%24<2.25 ? -11 : 0
      raster.data[index] = 187-cover*96+grain+band
      raster.data[index+1] = 202-cover*64+grain+band
      raster.data[index+2] = 169-cover*75+grain+band
      raster.data[index+3] = 255
    }
  }
  context.putImageData(raster,0,0)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const { geometry, properties } of map.features) {
    if (properties.kind === 'water' && geometry.type === 'Polygon') {
      plot(context,geometry.coordinates[0])
      context.closePath()
      context.fillStyle = '#7fa29a'
      context.fill()
      context.strokeStyle = '#a2b8a7'
      context.lineWidth = 1
      context.stroke()
    }
    if (geometry.type === 'LineString' && (properties.kind === 'road' || properties.kind === 'trail') && properties.name) {
      plot(context,geometry.coordinates)
      context.lineWidth = properties.kind === 'road' ? 1.6 : .75
      context.strokeStyle = properties.kind === 'road' ? '#e3d9b9' : '#d1c69e'
      context.stroke()
    }
  }
  const result = new T.CanvasTexture(canvas)
  result.colorSpace = T.SRGBColorSpace
  result.anisotropy = 4
  return result
}

export function makeTerrain(data: TerrainData, map: MapData, compact: boolean) {
  const group = new T.Group()
  const columns = compact ? 164 : 200
  const rows = compact ? 116 : 144
  const geometry = new T.PlaneGeometry(sceneWidth,sceneDepth,columns,rows)
  geometry.rotateX(-Math.PI/2)
  const vertices = geometry.attributes.position
  for (let i=0; i<vertices.count; i++) vertices.setY(i,worldHeight(data,fromLocal(vertices.getX(i),vertices.getZ(i))))
  geometry.computeVertexNormals()
  group.add(new T.Mesh(geometry,new T.MeshLambertMaterial({ map: texture(data,map) })))

  const sides: number[] = []
  const corners = [[-sceneWidth/2,-sceneDepth/2],[sceneWidth/2,-sceneDepth/2],[sceneWidth/2,sceneDepth/2],[-sceneWidth/2,sceneDepth/2]]
  corners.forEach(([x,z],i) => {
    const [xx,zz] = corners[(i+1)%4]
    const count = i%2 ? rows : columns
    for (let j=0; j<count; j++) {
      const a=j/count, b=(j+1)/count
      const ax=T.MathUtils.lerp(x,xx,a), az=T.MathUtils.lerp(z,zz,a)
      const bx=T.MathUtils.lerp(x,xx,b), bz=T.MathUtils.lerp(z,zz,b)
      const ay=worldHeight(data,fromLocal(ax,az)), by=worldHeight(data,fromLocal(bx,bz))
      sides.push(ax,ay,az,bx,by,bz,ax,-.28,az,bx,by,bz,bx,-.28,bz,ax,-.28,az)
    }
  })
  const sideGeometry = new T.BufferGeometry()
  sideGeometry.setAttribute('position',new T.Float32BufferAttribute(sides,3))
  sideGeometry.computeVertexNormals()
  group.add(new T.Mesh(sideGeometry,new T.MeshLambertMaterial({ color: '#c8ba9c', side:T.DoubleSide })))
  const plinth = new T.Mesh(new T.BoxGeometry(sceneWidth+.05,.07,sceneDepth+.05),new T.MeshLambertMaterial({ color:'#e9ddc4' }))
  plinth.position.y = -.303
  group.add(plinth)

  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const ctx = shadowCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(64,64,16,64,64,63)
  gradient.addColorStop(0,'rgba(36,54,36,.33)')
  gradient.addColorStop(.54,'rgba(36,54,36,.18)')
  gradient.addColorStop(1,'rgba(36,54,36,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0,0,128,128)
  const shadow = new T.Mesh(new T.PlaneGeometry(sceneWidth*1.55,sceneDepth*1.65),new T.MeshBasicMaterial({
    map: new T.CanvasTexture(shadowCanvas), transparent:true, depthWrite:false,
  }))
  shadow.rotateX(-Math.PI/2)
  shadow.position.set(.12,-.346,.17)
  group.add(shadow)

  let seed = 901
  function random() {
    seed = (Math.imul(seed,1664525) + 1013904223) | 0
    return (seed >>> 0)/4294967296
  }
  const treeCount = compact ? 3400 : 6400
  const canopy = new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshLambertMaterial({color:0xffffff}),treeCount)
  const dummy = new T.Object3D()
  const greens = ['#68875c','#7f9b67','#496d4d','#a0aa71','#5f7e50','#829761'].map(hex => new T.Color(hex))
  let index = 0
  for (let i=0;i<treeCount*3 && index<treeCount;i++) {
    const x = (random()-.5)*sceneWidth*.987, z = (random()-.5)*sceneDepth*.984
    const coord = fromLocal(x,z)
    const h = elevation(data,coord)
    if (h < 57 || random() > Math.min(.95,(h-52)/150)) continue
    const s = .009+random()*.018
    dummy.scale.set(s,s*(.8+random()*.8),s)
    dummy.position.set(x,worldHeight(data,coord)+s*.56,z)
    dummy.rotation.y = random()*Math.PI
    dummy.updateMatrix()
    canopy.setMatrixAt(index,dummy.matrix)
    canopy.setColorAt(index,greens[Math.floor(random()*greens.length)])
    index++
  }
  canopy.count = index
  group.add(canopy)
  return group
}

const cream = new T.MeshLambertMaterial({ color:'#ebe0c4' })
const white = new T.MeshLambertMaterial({ color:'#faf0d9' })
const blue = new T.MeshLambertMaterial({ color:'#385b72' })
const green = new T.MeshLambertMaterial({ color:'#4d725d' })
const copper = new T.MeshLambertMaterial({ color:'#916743' })

export function landmark(id: string) {
  const group = new T.Group()
  function add(geometry:T.BufferGeometry, material:T.Material, x:number,y:number,z:number, rotation=0) {
    const mesh = new T.Mesh(geometry,material)
    mesh.position.set(x,y,z)
    mesh.rotation.y=rotation
    group.add(mesh)
  }
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,m=cream) => add(new T.BoxGeometry(w,h,d),m,x,y,z)
  const roof = (w:number,h:number,x:number,y:number,z:number,m:T.Material) => add(new T.ConeGeometry(w,h,4),m,x,y,z,Math.PI/4)
  if (id==='sun') {
    box(.18,.035,.12,0,.018,0,white)
    box(.135,.056,.083,0,.063,-.005)
    roof(.112,.067,0,.119,-.005,blue)
    for (let i=0;i<7;i++) box(.076,.032-i*.004,.028,0,(.032-i*.004)/2,.065+i*.017,white)
    box(.096,.028,.028,0,.014,.21)
    roof(.076,.022,0,.039,.21,blue)
  } else if (id==='observatory') {
    box(.163,.024,.09,.016,.012,0)
    for (const [x,s] of [[-.043,.056],[.063,.038]]) {
      add(new T.CylinderGeometry(s,s,s*.9,12),white,x,s*.42,0)
      add(new T.SphereGeometry(s,12,5,0,Math.PI*2,0,Math.PI/2),white,x,s*.9,0)
    }
  } else if (id==='palace' || id==='ming') {
    box(.155,.028,.1,0,.016,0)
    box(.12,.063,.078,0,.058,0,id==='ming'?copper:cream)
    roof(.106,.054,0,.104,0,id==='ming'?copper:green)
    box(.078,.03,.055,0,.116,0)
    roof(.076,.042,0,.15,0,id==='ming'?copper:green)
  } else if (id==='tower') {
    for (let i=0;i<7;i++) {
      const radius = .051-i*.0045
      add(new T.CylinderGeometry(radius*.72,radius*.8,.029,8),cream,0,.02+i*.032,0)
      add(new T.CylinderGeometry(radius*.62,radius,.013,8),copper,0,.038+i*.032,0)
    }
    add(new T.ConeGeometry(.015,.037,7),copper,0,.26,0)
  } else if (id==='music') {
    for (let i=0;i<4;i++) {
      const geo = new T.RingGeometry(.04+i*.018,.051+i*.018,18,1,0,Math.PI)
      geo.rotateX(-Math.PI/2)
      add(geo,white,0,.008+i*.012,0,Math.PI)
    }
    box(.115,.027,.041,0,.015,-.034)
    box(.11,.055,.012,0,.036,-.056,white)
  }
  return group
}

export function place(data: TerrainData, point: Coordinate, offset = 0) {
  const [x,z] = toLocal(point)
  return new T.Vector3(x,worldHeight(data,point)+offset,z)
}
