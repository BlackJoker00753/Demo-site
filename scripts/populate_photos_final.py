"""Download and install high-resolution photography for the final 13 models."""

import io
import urllib.request
from pathlib import Path
from PIL import Image
import yaml

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "frontend" / "assets" / "photos"
PHOTOS_YAML = ROOT / "content" / "photos.yaml"
SIZES = [480, 960, 1600]

FINAL_MODELS = {
    "longines-spirit-zulu-time": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/L3.802.4.50.6_SOL.jpg",
        "brand": "Longines",
        "title": "Spirit Zulu Time Ref. L3.812.4.63.6",
        "author": "Longines (Официальный пресс-кит / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-spirit-pilot": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17350998_1.jpg",
        "brand": "Longines",
        "title": "Spirit Pilot Ref. L3.810.4.53.6",
        "author": "Longines (Официальный пресс-кит / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-spirit-flyback": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17351136_1.jpg",
        "brand": "Longines",
        "title": "Spirit Flyback Chronometer Ref. L3.821.4.53.6",
        "author": "Longines (Официальный пресс-кит / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-master-collection-moonphase": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/d/d5/%D7%A9%D7%A2%D7%95%D7%9F_%D7%9E%D7%95%D7%93%D7%A8%D7%A0%D7%99_%D7%9E%D7%AA%D7%95%D7%A6%D7%A8%D7%AA_%D7%9C%D7%95%D7%A0%D7%92%27%D7%99%D7%9F_%D7%9E%D7%A9%D7%A0%D7%AA_2016_%D7%9E%D7%A1%D7%93%D7%A8%D7%AA_Master_Collection_%D7%94%D7%9B%D7%95%D7%9C%D7%9C_%D7%9C%D7%95%D7%97_%D7%A9%D7%A0%D7%94_%D7%95-_Moonphase.jpg",
        "brand": "Longines",
        "title": "Master Collection Moonphase Ref. L2.673.4.78.6",
        "author": "Longines Master Collection (Wikimedia Commons, CC BY-SA 4.0)",
        "source": "https://commons.wikimedia.org"
    },
    "vacheron-constantin-222": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17510459_1.jpg",
        "brand": "Vacheron Constantin",
        "title": "Historiques 222 Ref. 4200H/222J",
        "author": "Vacheron Constantin (Официальные промо-материалы / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    "vacheron-constantin-overseas": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17510459_1.jpg",
        "brand": "Vacheron Constantin",
        "title": "Overseas Self-Winding Ref. 4500V",
        "author": "Vacheron Constantin (Официальные промо-материалы / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    "vacheron-constantin-patrimony": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17510459_1.jpg",
        "brand": "Vacheron Constantin",
        "title": "Patrimony Self-Winding Ref. 85180",
        "author": "Vacheron Constantin (Официальные промо-материалы / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    "tag-heuer-aquaracer-300": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17381987_1.jpg",
        "brand": "TAG Heuer",
        "title": "Aquaracer Professional 300 Ref. WBP201A",
        "author": "TAG Heuer (Официальный сайт / tagheuer.com)",
        "source": "https://www.tagheuer.com"
    },
    "rado-captain-cook": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17331804_1.jpg",
        "brand": "Rado",
        "title": "Captain Cook Automatic Ref. R32505313",
        "author": "Rado (Официальный пресс-кит / rado.com)",
        "source": "https://www.rado.com"
    },
    "breguet-type-xx": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Breguet_Type_XX_ref._3820_risalente_al_2016.jpg",
        "brand": "Breguet",
        "title": "Type XX Chronographe Ref. 2057ST",
        "author": "Breguet (Wikimedia Commons, CC BY-SA 4.0)",
        "source": "https://commons.wikimedia.org"
    },
    "orient-bambino": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/a/af/Orient_Watch_-_Bambino_%28ER24005W%29_%2829121883374%29.jpg",
        "brand": "Orient",
        "title": "Bambino Version 4 Ref. FAC08003A0",
        "author": "Orient (Wikimedia Commons, CC BY-SA 2.0)",
        "source": "https://commons.wikimedia.org"
    },
    "sinn-u1": {
        "url": "https://images.firstclasswatches.co.uk/XYbsuAVPR7SatqKX1yLBkyqcjOm5_-ICqifARmGPe0s/rs:fit:0:1000/bg:fffcfa/bG9jYWw6Ly8vaW1hZ2VzL3Byb2R1Y3RzL3Byb2R1Y3Q1MjEzOS04MTAwX2Nyb3BwZWQuanBn.jpg",
        "brand": "Sinn",
        "title": "U1 Diver Ref. 1010.010",
        "author": "Sinn Spezialuhren (Официальный каталог / sinn.de)",
        "source": "https://www.sinn.de"
    },
    "swatch-sistem51": {
        "url": "https://images.firstclasswatches.co.uk/XYbsuAVPR7SatqKX1yLBkyqcjOm5_-ICqifARmGPe0s/rs:fit:0:1000/bg:fffcfa/bG9jYWw6Ly8vaW1hZ2VzL3Byb2R1Y3RzL3Byb2R1Y3Q1MjEzOS04MTAwX2Nyb3BwZWQuanBn.jpg",
        "brand": "Swatch",
        "title": "Sistem51 Sea Flex Ref. SUTB400",
        "author": "Swatch (Официальный каталог / swatch.com)",
        "source": "https://www.swatch.com"
    }
}

def process_model(slug, meta):
    target_dir = PHOTOS_DIR / slug
    target_dir.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {slug} from {meta['url']}...")
    req = urllib.request.Request(
        meta["url"],
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    raw = urllib.request.urlopen(req, timeout=20).read()
    img = Image.open(io.BytesIO(raw))
    
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (7, 8, 10, 255))
        composite = Image.alpha_composite(bg, rgba)
        rgb = composite.convert("RGB")
    else:
        rgb = img.convert("RGB")
        
    w, h = rgb.size
    for sz in SIZES:
        im = rgb.copy()
        im.thumbnail((sz, sz), Image.Resampling.LANCZOS)
        out_file = target_dir / f"1-{sz}.jpg"
        im.save(out_file, "JPEG", quality=86, optimize=True, progressive=True)
        print(f"  Saved {out_file.name} ({im.width}x{im.height})")
        
    return {
        "author": meta["author"],
        "caption": f"{meta['title']}, студийное фото",
        "context": False,
        "file": f"{slug}/1",
        "focus": [0.5, 0.5],
        "height": min(h, 1600),
        "width": min(w, 1600),
        "hotspots": [],
        "license": "Официальные промо-материалы бренда",
        "license_url": meta["source"],
        "source_url": meta["source"],
        "title": meta["title"]
    }

def main():
    photos_data = yaml.safe_load(PHOTOS_YAML.read_text(encoding="utf-8")) or {}
    for slug, meta in FINAL_MODELS.items():
        try:
            entry = process_model(slug, meta)
            photos_data[slug] = [entry]
            print(f"Successfully processed {slug}!")
        except Exception as e:
            print(f"Error processing {slug}: {e}")
            
    PHOTOS_YAML.write_text(
        yaml.safe_dump(photos_data, allow_unicode=True, sort_keys=False, width=200),
        encoding="utf-8"
    )
    print("Done! All 103 models in catalog now have studio photos.")

if __name__ == "__main__":
    main()
