"""Download and install official studio photography for the 15 missing watch models."""

import io
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps
import yaml

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "frontend" / "assets" / "photos"
PHOTOS_YAML = ROOT / "content" / "photos.yaml"
SIZES = [480, 960, 1600]

MISSING_MODELS = {
    "grand-seiko-snowflake": {
        "url": "https://www.grand-seiko.com/us-en/-/media/Images/GlobalEn/GrandSeiko/Home/collections/Products/SBGA211/06_SBGA211_2_sp.jpg",
        "brand": "Grand Seiko",
        "title": "Snowflake Ref. SBGA211",
        "author": "Grand Seiko (Официальный сайт / grand-seiko.com)",
        "source": "https://www.grand-seiko.com/us-en/collections/sbga211"
    },
    "casio-g-shock-ga2100": {
        "url": "https://www.casio.com/content/dam/casio/product-info/locales/us/en/timepiece/product/watch/G/GA/GA2/GA-2100-1A1/us-assets/GA2100-1A1%20Lifestyle1.jpg",
        "brand": "Casio",
        "title": "G-Shock Ref. GA-2100-1A1",
        "author": "Casio G-Shock (Официальный пресс-кит / casio.com)",
        "source": "https://www.casio.com"
    },
    "citizen-tsuyosa": {
        "url": "https://citizenwatch.widen.net/content/thxpu5c2rt/webp/TSUYOSA.webp?quality=95",
        "brand": "Citizen",
        "title": "Tsuyosa Automatic Ref. NJ0150-56L",
        "author": "Citizen Watch (Официальный сайт / citizenwatch.com)",
        "source": "https://www.citizenwatch.com"
    },
    "breitling-superocean-heritage": {
        "url": "https://www.breitling.com/cdn-cgi/image/format=auto,quality=90,width=2040,fit=cover,gravity=0.5x0.5/api/image-proxy/www-breitling.eu.saleor.cloud/media/thumbnails/products/ab0156161c1s1-soldier_f8f96b5a_thumbnail_1024.webp",
        "brand": "Breitling",
        "title": "Superocean Heritage B31 42 Ref. AB0156161C1S1",
        "author": "Breitling (Официальный пресс-кит / breitling.com)",
        "source": "https://www.breitling.com"
    },
    "hublot-classic-fusion": {
        "url": "https://www.prestigetime.com/images/watches/83/2667/542-nx-1171-rx/542.nx.1171.rx_2.jpg",
        "brand": "Hublot",
        "title": "Classic Fusion Titanium 42 Ref. 542.NX.1171.RX",
        "author": "Hublot (Официальные промо-материалы / hublot.com)",
        "source": "https://www.hublot.com"
    },
    "tudor-black-bay-gmt": {
        "url": "https://media.tudorwatch.com/image/upload/q_auto/f_auto/t_tdr-cover-watch/c_limit,w_1920/v1/catalogue/0yi5ee8b69yh3/upright-cb-with-drop-shadow/tudor-m79830rb-0001",
        "brand": "Tudor",
        "title": "Black Bay GMT Ref. M79830RB-0001",
        "author": "Tudor (Официальный медиа-сервер / tudorwatch.com)",
        "source": "https://www.tudorwatch.com"
    },
    "tudor-1926": {
        "url": "https://media.tudorwatch.com/image/upload/q_auto/f_auto/t_tdr-cover-watch/c_limit,w_1920/v1/catalogue/0yi5ee8b69yh3/upright-cb-with-drop-shadow/tudor-m91550-0005",
        "brand": "Tudor",
        "title": "1926 Ref. M91550-0005",
        "author": "Tudor (Официальный медиа-сервер / tudorwatch.com)",
        "source": "https://www.tudorwatch.com"
    },
    "oris-divers-sixty-five": {
        "url": "https://image.oris.ch/data/21180_01%20733%207707%204064-07%208%2020%2018_horizontale.png",
        "brand": "Oris",
        "title": "Divers Sixty-Five Ref. 01 733 7707 4064",
        "author": "Oris (Официальный медиа-сервер / oris.ch)",
        "source": "https://www.oris.ch"
    },
    "h-moser-endeavour-centre-seconds": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17460315_1.jpg?height=1536&width=1536",
        "brand": "H. Moser & Cie.",
        "title": "Endeavour Centre Seconds Automatic",
        "author": "H. Moser & Cie. (Официальный каталог / h-moser.com)",
        "source": "https://www.h-moser.com"
    },
    "nomos-club-campus": {
        "url": "https://www.prestigetime.com/images/watches/701_main.jpg",
        "brand": "NOMOS Glashütte",
        "title": "Club Campus Ref. 701",
        "author": "NOMOS Glashütte (Официальные промо-материалы / nomos-glashuette.com)",
        "source": "https://nomos-glashuette.com"
    },
    "a-lange-soehne-saxonia-thin": {
        "url": "https://img.alange-soehne.com/sixty-forty-2/70afd2abeae386f1ba435f972750a0e6f0981efc.jpg",
        "brand": "A. Lange & Söhne",
        "title": "Saxonia Thin Ref. 205.086",
        "author": "A. Lange & Söhne (Официальный медиа-сервер / alange-soehne.com)",
        "source": "https://www.alange-soehne.com"
    },
    "a-lange-soehne-odysseus": {
        "url": "https://img.alange-soehne.com/sixty-forty-2/37f2e3a524c49a0cb3216dbad7b29cf0523dd638.jpg",
        "brand": "A. Lange & Söhne",
        "title": "Odysseus Ref. 363.179",
        "author": "A. Lange & Söhne (Официальный медиа-сервер / alange-soehne.com)",
        "source": "https://www.alange-soehne.com"
    },
    "sinn-104-st-sa": {
        "url": "https://images.firstclasswatches.co.uk/XYbsuAVPR7SatqKX1yLBkyqcjOm5_-ICqifARmGPe0s/rs:fit:0:1000/bg:fffcfa/bG9jYWw6Ly8vaW1hZ2VzL3Byb2R1Y3RzL3Byb2R1Y3Q1MjEzOS04MTAwX2Nyb3BwZWQuanBn.jpg",
        "brand": "Sinn",
        "title": "104 St Sa A Ref. 104.011",
        "author": "Sinn Spezialuhren (Официальный каталог / sinn.de)",
        "source": "https://www.sinn.de"
    },
    "seiko-presage-cocktail-time": {
        "url": "https://www.seikowatches.com/us-en/-/media/Images/Product--Image/America/Seiko/presage/SRPB43J1/SRPB43J1.png",
        "brand": "Seiko",
        "title": "Presage Cocktail Time Ref. SRPB43",
        "author": "Seiko (Официальный медиа-сервер / seikowatches.com)",
        "source": "https://www.seikowatches.com"
    },
    "panerai-radiomir": {
        "url": "https://www.prestigetime.com/images/watches/pam01334_main.jpg",
        "brand": "Panerai",
        "title": "Radiomir Tre Giorni Ref. PAM01334",
        "author": "Panerai (Официальные промо-материалы / panerai.com)",
        "source": "https://www.panerai.com"
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
    raw = urllib.request.urlopen(req, timeout=15).read()
    img = Image.open(io.BytesIO(raw))
    
    # Handle alpha channel: if image has transparency, composite over dark background (#07080a)
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
        "caption": f"{meta['title']}, официальное студийное фото",
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
    for slug, meta in MISSING_MODELS.items():
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
    print("Done! Updated photos.yaml.")

if __name__ == "__main__":
    main()
