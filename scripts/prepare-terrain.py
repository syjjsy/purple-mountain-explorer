"""Build a local signed 16-bit DEM and a north-up relief image from Terrarium tiles."""
import json
import math
import os
import struct
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/terrain"
CACHE = Path(os.environ.get("PURPLE_DATA_CACHE", "/tmp/purple-data"))
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
WEST, SOUTH, EAST, NORTH = 118.808, 32.041, 118.876, 32.082
WIDTH, HEIGHT, ZOOM = 201, 145, 14
SIDE = 256 * 2 ** ZOOM

def pixel(lon, lat):
    return (lon + 180) / 360 * SIDE, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) * SIDE / 2

x1, y1 = pixel(WEST, NORTH)
x2, y2 = pixel(EAST, SOUTH)
keys = [(x, y) for y in range(int(y1/256), int(y2/256)+1)
        for x in range(int(x1/256), int(x2/256)+1)]
urls = []

def tile(key):
    x, y = key
    file = CACHE / f"terrarium-{ZOOM}-{x}-{y}.png"
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x}/{y}.png"
    if not file.exists():
        subprocess.run(["curl", "-fLsS", "--retry", "2", "--max-time", "25", url, "-o", str(file)], check=True)
    return key, Image.open(file).convert("RGB").load(), url

with ThreadPoolExecutor(max_workers=8) as pool:
    entries = list(pool.map(tile, keys))
tiles = {key: img for key, img, _ in entries}

def point_height(x, y):
    r, g, b = tiles[(x//256, y//256)][x%256, y%256]
    return 256*r + g + b/256 - 32768

def height_at(lon, lat):
    x, y = pixel(lon, lat)
    ix, iy = int(x), int(y)
    u, v = x-ix, y-iy
    return ((1-v)*((1-u)*point_height(ix,iy)+u*point_height(ix+1,iy))
            + v*((1-u)*point_height(ix,iy+1)+u*point_height(ix+1,iy+1)))

grid = [[height_at(WEST+(EAST-WEST)*x/(WIDTH-1), NORTH-(NORTH-SOUTH)*y/(HEIGHT-1))
         for x in range(WIDTH)] for y in range(HEIGHT)]
values = [round(z*10) for row in grid for z in row]
(OUT/"zhongshan.i16").write_bytes(struct.pack(f"<{len(values)}h", *values))
(OUT/"metadata.json").write_text(json.dumps({
    "bounds": [WEST,SOUTH,EAST,NORTH], "columns":WIDTH, "rows":HEIGHT,
    "unit": "0.1 meters", "min":min(values)/10, "max":max(values)/10,
    "source": "Mapzen Terrain Tiles (AWS Open Data), Terrarium",
    "sourceUrl": "https://registry.opendata.aws/terrain-tiles/",
    "tileUrls": [url for _,_,url in entries],
}, indent=2)+"\n")

field = Image.new("F", (WIDTH,HEIGHT))
field.putdata([v/10 for v in values])
field = field.resize((900,642), Image.Resampling.BICUBIC)
img = Image.new("RGB", field.size)
f, out = field.load(), img.load()
for y in range(642):
    for x in range(900):
        z = f[x,y]
        dx = f[min(899,x+2),y]-f[max(0,x-2),y]
        dy = f[x,min(641,y+2)]-f[x,max(0,y-2)]
        shade = max(-33,min(32,(dx+dy)*0.8))
        cover = min(1,max(0,(z-55)/280))
        contour = -7 if z>37 and z%25 < max(0.65, (abs(dx)+abs(dy))/4) else 0
        out[x,y] = tuple(int(max(0,min(255,a*(1-cover)+b*cover+shade+contour))) for a,b in zip((237,238,222),(126,156,117)))
img.save(OUT/"relief.webp", quality=90)
print(f"{WIDTH}×{HEIGHT} | {min(values)/10:.1f}–{max(values)/10:.1f} m | {len(values)*2:,} bytes")
