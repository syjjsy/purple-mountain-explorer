"""Build scene geometry, source-linked POIs and audited way slices from an OSM XML extract."""
import json
import math
import struct
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TERRAIN = ROOT/"public/terrain"
META = json.loads((TERRAIN/"metadata.json").read_text())
WEST,SOUTH,EAST,NORTH = META["bounds"]
WIDTH,HEIGHT = META["columns"],META["rows"]
DATA = struct.unpack(f"<{WIDTH*HEIGHT}h",(TERRAIN/"zhongshan.i16").read_bytes())
OSM = ET.parse(sys.argv[1]).getroot()
NODES = {int(e.get("id")): (float(e.get("lon")),float(e.get("lat"))) for e in OSM.findall("node")}
WAYS = {int(e.get("id")): [int(nd.get("ref")) for nd in e.findall("nd")] for e in OSM.findall("way")}
TAGS = {(e.tag,int(e.get("id"))): {tag.get("k"):tag.get("v") for tag in e.findall("tag")}
        for e in OSM if e.tag in ("way","node","relation")}

def path(way):
    return [NODES[n] for n in WAYS[way]]

def ground(coordinate):
    x,y = coordinate
    u,v = (x-WEST)/(EAST-WEST)*(WIDTH-1), (NORTH-y)/(NORTH-SOUTH)*(HEIGHT-1)
    i,j = min(WIDTH-2,math.floor(u)), min(HEIGHT-2,math.floor(v))
    a,b = u-i,v-j
    return ((1-b)*((1-a)*DATA[j*WIDTH+i]+a*DATA[j*WIDTH+i+1])
           +b*((1-a)*DATA[(j+1)*WIDTH+i]+a*DATA[(j+1)*WIDTH+i+1]))/10

def center(way):
    ps = path(way)
    if ps[0] == ps[-1]:
        ps = ps[:-1]
    return tuple(round((min(p[n] for p in ps)+max(p[n] for p in ps))/2,7) for n in (0,1))

def midpoint(way):
    ps = path(way)
    return ps[len(ps)//2]

def length(a,b):
    lon1,lat1=map(math.radians,a)
    lon2,lat2=map(math.radians,b)
    h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 12742017.6*math.asin(math.sqrt(h))

def rounded(p):
    return [round(t,6) for t in p]

points = {
    "sun": ("way",483693967,center(483693967),"祭堂"),
    "ming": ("way",380923041,center(380923041),"宝顶"),
    "linggu": ("way",1088448627,center(1088448627),"寺院院落"),
    "palace": ("way",338667850,center(338667850),"官邸建筑"),
    "observatory": ("way",256405122,center(256405122),"历史台址范围"),
    "ridge": ("node",2600783562,NODES[2600783562],"山峰"),
    "music": ("way",141915419,center(141915419),"露天音乐台"),
    "spirit": ("way",249355083,midpoint(249355083),"石象路沿线"),
    "plum": ("way",791617219,center(791617219),"山丘范围"),
    "garden": ("relation",18303734,center(1024275491),"植物园北园范围"),
    "cable": ("node",667282790,NODES[667282790],"地堡城站"),
    "pipa": ("way",62700582,center(62700582),"湖面"),
    "zixia": ("way",166719565,center(166719565),"湖面"),
    "avenue": ("way",146635645,NODES[1575080578],"步行道中段"),
    "tower": ("way",704448441,center(704448441),"塔身"),
}
entries = {
    "sun": (12345226894,"博爱坊（游览起点）"),
    "ming": (667334437,"明孝陵 1 号门"),
    "linggu": (5752825678,"灵谷景区红山门"),
    "tower": (5752825678,"灵谷景区红山门"),
    "palace": (8012859710,"美龄宫检票入口"),
    "cable": (667282790,"索道地堡城站"),
    "plum": (12042687721,"明孝陵 5 号门"),
    "spirit": (12042687721,"明孝陵 5 号门"),
}
destinations = {
    "observatory": (2600805491,"索道天文台站"),
    "garden": (1599036658,"中山植物园公交站"),
    "pipa": (3780775000,"琵琶湖公交站"),
}
poi = {}
for key,(kind,id,coord,role) in points.items():
    assert WEST < coord[0] < EAST and SOUTH < coord[1] < NORTH
    item = {"coordinates":rounded(coord),"coordinatesSource":f"https://www.openstreetmap.org/{kind}/{id}",
            "coordinateRole":role, "elevation":round(ground(coord))}
    if key in entries:
        n,name = entries[key]
        item.update(entranceCoordinates=rounded(NODES[n]), entranceName=name,
                    entranceSource=f"https://www.openstreetmap.org/node/{n}")
    if key in destinations:
        n,name = destinations[key]
        item.update(navigationCoordinates=rounded(NODES[n]), navigationName=name,
                    navigationSource=f"https://www.openstreetmap.org/node/{n}")
    poi[key] = item

# Each route is a named public way corridor or a specific official attraction walk.
# A slice gives the exact way id and the first/last OSM nodes to retain.
routes = {
    "hike": [(972522875,None,None),(972522877,None,None),(257377405,None,None),
             (255491188,2611775354,6639670409),(52502922,6639670409,667283025)],
    "heritage": [(249355083,12042687721,2559698850)],
    "easy": [(254292752,None,None)],
}
route_data = {}
for key,slices in routes.items():
    ns=[]
    for way,start,end in slices:
        tags=TAGS["way",way]
        assert tags.get("foot") not in ("no","private")
        assert tags.get("access") not in ("no","private")
        nodes=WAYS[way]
        if start is not None:
            i,j=nodes.index(start),nodes.index(end)
            nodes = nodes[i:j+1] if i<=j else nodes[j:i+1][::-1]
        if ns:
            assert ns[-1]==nodes[0], (ns[-1],nodes[0])
            ns.extend(nodes[1:])
        else:
            ns.extend(nodes)
    coords=[NODES[n] for n in ns]
    dist=sum(length(a,b) for a,b in zip(coords,coords[1:]))
    # Uniform 25 m samples, with 50 m smoothing to suppress short raster fluctuations.
    samples=[ground(coords[0])]
    traveled, next_sample = 0,25
    for a,b in zip(coords,coords[1:]):
        segment=length(a,b)
        while segment>0 and next_sample <= traveled+segment:
            ratio=(next_sample-traveled)/segment
            samples.append(ground(tuple(x+(y-x)*ratio for x,y in zip(a,b))))
            next_sample+=25
        traveled+=segment
    samples.append(ground(coords[-1]))
    avg=[samples[0],*[sum(samples[i-1:i+2])/3 for i in range(1,len(samples)-1)],samples[-1]]
    ascent=sum(max(0,b-a) for a,b in zip(avg,avg[1:]))
    # Distance / 4 km/h plus ascent / 600 m/h, then round to five minutes.
    minutes=max(5,5*round((dist/4000*60+ascent/600*60)/5))
    route_data[key]={"geometry":[rounded(p) for p in coords], "meters":round(dist),
                     "ascent":round(ascent), "minutes":minutes, "osmWays":[way for way,_,_ in slices]}

def in_box(p):
    return WEST-0.004 < p[0] < EAST+0.004 and SOUTH-0.003 < p[1] < NORTH+0.003

features=[]
for way,ns in WAYS.items():
    tags=TAGS["way",way]
    kind=None
    if tags.get("natural") in ("water","wood") or tags.get("landuse") == "forest" or (way==63058368):
        if ns[0]==ns[-1] and len(ns)>3:
            kind = "water" if tags.get("natural")=="water" else "boundary" if way==63058368 else "forest"
    elif tags.get("highway") in ("primary","secondary","tertiary","unclassified","pedestrian","residential","service","footway","steps","path","cycleway"):
        h=tags["highway"]
        if tags.get("access") in ("no","private") or tags.get("foot") in ("no","private"):
            continue
        kind = "trail" if h in ("footway","steps","path","cycleway") else "road"
    elif tags.get("aerialway") in ("gondola","cable_car","chair_lift"):
        kind = "cable"
    if not kind:
        continue
    coords=path(way)
    if not any(map(in_box,coords)) or len(coords)<2:
        continue
    if kind=="road" and len(coords)<4 and not tags.get("name"):
        continue
    polygon=kind in ("forest","water","boundary")
    features.append({"type":"Feature", "properties":{"kind":kind,"name":tags.get("name",""),"osmWay":way},
      "geometry":{"type":"Polygon" if polygon else "LineString",
                  "coordinates":[[rounded(p) for p in coords]] if polygon else [rounded(p) for p in coords]}})
(ROOT/"src/poi-geometry.json").write_text(json.dumps(poi,ensure_ascii=False,indent=2)+"\n")
(ROOT/"src/route-geometry.json").write_text(json.dumps(route_data,ensure_ascii=False,separators=(",",":"))+"\n")
(ROOT/"public/geojson/zhongshan.geojson").write_text(json.dumps({"type":"FeatureCollection","features":features},ensure_ascii=False,separators=(",",":"))+"\n")
routes_geojson={"type":"FeatureCollection","features":[{"type":"Feature","properties":{"id":key,"meters":item["meters"],"osmWays":item["osmWays"]},"geometry":{"type":"LineString","coordinates":item["geometry"]}} for key,item in route_data.items()]}
(ROOT/"public/geojson/route-lines.geojson").write_text(json.dumps(routes_geojson,ensure_ascii=False,separators=(",",":"))+"\n")
print(f"{len(poi)} POIs, {len(features)} features")
for key,item in route_data.items():
    print(key,item["meters"],item["ascent"],item["minutes"], item["geometry"][0],item["geometry"][-1])
