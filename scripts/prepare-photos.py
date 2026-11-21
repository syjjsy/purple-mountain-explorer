"""Retrieve selected Commons photos and record the author and reuse license of each."""
import argparse, html, json, re, subprocess, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SELECTION = {
    "sun": ["Nanjing - Sun Yat-sen Mausoleum - Beiting.jpg", "Nanjing - Sun Yat-sen Mausoleum - View 01.jpg", "Looking down Sun Yat-sen Mausoleum.jpg"],
    "ming": ["China-Nanjing (2024) Ming Xiaoling - Xiaoling Hall 孝陵殿 - img 03.jpg", "Ming Xiaoling 0.jpg", "Ming Xiaoling - grounds - P1060495.JPG"],
    "linggu": ["灵谷寺航拍20220528 01.jpg", "Linggu Temple (2024-Apr) - img 01.jpg", "Linggu Temple (2024-Apr) - img 04.jpg"],
    "palace": ["Mei-ling Villa, Nov 2017 (1).jpg", "Meiling Gong 2.jpg", "Meiling Villa.jpg"],
    "observatory": ["National PMO Old Site.jpg", "Purple Mountain Observatory 2016.7.16-1.jpg", "Armillarsphäre Nanjing.jpg"],
    "music": ["Music Stage of Sun Yat-sen Mauloleum.jpg", "Music Stage of Sun Yat-sen Mauloleum 2.jpg", "Sun Yat-sens Music Stage.jpg"],
    "tower": ["Linggu Pagoda (709487357).jpg", "2024-Apr Linggu Pagoda 灵谷塔 Nanjing - img 01.jpg", "南京灵谷塔.jpg"],
    "ridge": ["20121111南京紫金山顶俯瞰北坡林木繁茂2 - panoramio.jpg", "20180602紫金山顶俯瞰01.jpg", "20120603南京紫金山峰顶北望城区灰霾3 - panoramio.jpg"],
    "mountain": ["Nanjing XuanWuLake Purple and Mountain.jpg"],
    "garden": ["中山植物园（南园）景色01.jpg", "Nanjing Botanical Garden, Memorial Sun Yat-Sen.jpg", "中山植物园（北园）景色06.jpg"],
    "spirit": ["Ming Xiaoling Mausoleum Spirit Way.jpg", "Stone Elephant Road (Ming Xiaoling) 2.jpg", "南京明孝陵景区石象路 - panoramio (1).jpg"],
    "plum": ["2019南京梅花山01.jpg", "2019南京梅花山02.jpg", "明孝陵-梅花山.jpg"],
    "zixia": ["Zixia Lake.jpg", "紫霞湖与紫金山.jpg", "紫霞湖畔正气亭.jpg"],
    "pipa": ["Pipa Lake, Nanjing(flickr 6921000498).jpg"],
    "avenue": ["Tree-lined avenue Zhongshanling.jpg"],
    "cable": ["49324-Nanjing (27915886771).jpg", "Zijingshan03.jpg"],
}

def plain(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', value)).split())

def fetch(url):
    return subprocess.check_output(["curl","-fLsS","--retry","1","--max-time","28",
                                    "-A","PurpleMountainExplorer/1.0 (open travel atlas)",url])

def prepare(item):
    key, titles = item
    query = urllib.parse.urlencode({"action":"query", "titles":"|".join("File:"+t for t in titles),
        "prop":"imageinfo", "iiprop":"url|extmetadata|size", "iiurlwidth":960, "format":"json"})
    pages = json.loads(fetch("https://commons.wikimedia.org/w/api.php?"+query))["query"]["pages"]
    by_name = {page["title"][5:]:page for page in pages.values()}
    results = []
    for index,title in enumerate(titles,1):
        match = by_name.get(title)
        if not match or not match.get("imageinfo"):
            print(f"Missing {title}",flush=True)
            continue
        d = match["imageinfo"][0]
        meta = d["extmetadata"]
        license_name = meta.get("LicenseShortName",{}).get("value","")
        author = plain(meta.get("Artist",{}).get("value",""))
        if not author or not re.match(r"^(CC BY(?:-SA)? |CC0|Public domain)",license_name):
            print(f"Skipped {title}: {license_name} / {author}",flush=True)
            continue
        try:
            try:
                raw = fetch(d.get("thumburl",d["url"]))
            except subprocess.CalledProcessError:
                raw = fetch(d["url"])
            photo = ImageOps.exif_transpose(Image.open(BytesIO(raw))).convert("RGB")
            photo.thumbnail((960,960))
            image_id = f"{key}-{index}"
            width = photo.width
            photo.save(ROOT/"public/images"/f"{image_id}.webp", quality=83, method=6)
            photo.thumbnail((510,510))
            photo.save(ROOT/"public/images"/f"{image_id}-small.webp", quality=80, method=6)
            results.append({"id":image_id,"title":title,"author":author,"license":license_name,
                "licenseUrl":meta.get("LicenseUrl",{}).get("value","https://creativecommons.org/publicdomain/mark/1.0/"),
                "source":d["descriptionurl"],"width":width,"smallWidth":photo.width})
        except (subprocess.CalledProcessError, OSError) as error:
            print(f"Unavailable {title}: {error}",flush=True)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("groups", nargs="*", metavar="GROUP")
    args = parser.parse_args()
    selected = {key: SELECTION[key] for key in args.groups} if args.groups else SELECTION
    manifest = ROOT/"src/photos.json"
    preserved = [photo for photo in json.loads(manifest.read_text()) if photo["id"].rsplit("-",1)[0] not in selected] if args.groups and manifest.exists() else []
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = [photo for group in pool.map(prepare,selected.items()) for photo in group]
    manifest.write_text(json.dumps(preserved+results,ensure_ascii=False,indent=2)+"\n")
    print(f"{len(results)} photos")
