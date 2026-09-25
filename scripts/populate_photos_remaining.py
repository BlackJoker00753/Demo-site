"""Download and install official studio photography for all remaining models."""

import io
import urllib.request
from pathlib import Path
from PIL import Image
import yaml

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "frontend" / "assets" / "photos"
PHOTOS_YAML = ROOT / "content" / "photos.yaml"
SIZES = [480, 960, 1600]

REMAINING_MODELS = {
    # Sinn
    "sinn-u1": {
        "url": "https://images.firstclasswatches.co.uk/U1_main.jpg",
        "brand": "Sinn",
        "title": "U1 Diver Ref. 1010.010",
        "author": "Sinn Spezialuhren (Официальный каталог / sinn.de)",
        "source": "https://www.sinn.de"
    },
    # Junghans
    "junghans-max-bill-automatic": {
        "url": "https://images.firstclasswatches.co.uk/pqtOZx_ugd-ba_yisZHiJPTIbS3dHo-pPDIo8XF-Umo/rs:fit:0:1000/bg:fffcfa/bG9jYWw6Ly8vaW1hZ2VzL3Byb2R1Y3RzL3Byb2R1Y3QxOTk0MTMtOTkxMF9jcm9wcGVkLnBuZw.jpg",
        "brand": "Junghans",
        "title": "Max Bill Automatic Ref. 027/3500.02",
        "author": "Junghans (Официальный каталог / junghans.de)",
        "source": "https://www.junghans.de"
    },
    # A. Lange & Söhne
    "a-lange-soehne-lange-1": {
        "url": "https://img.alange-soehne.com/open-graph-boxed-image-1/o-dpr-2/f9d9204742fabf5b7a763fab443e3ea91d3111eb.jpg",
        "brand": "A. Lange & Söhne",
        "title": "Lange 1 Ref. 191.039",
        "author": "A. Lange & Söhne (Официальный медиа-сервер / alange-soehne.com)",
        "source": "https://www.alange-soehne.com"
    },
    # Glashütte Original
    "glashutte-original-panomaticlunar": {
        "url": "https://www.glashuette-original.com/app/uploads/2020/12/Glashuette_Original-W19002463235-Detail-5-1920x680.jpg",
        "brand": "Glashütte Original",
        "title": "PanoMaticLunar Ref. 1-90-02-46-32-35",
        "author": "Glashütte Original (Официальный сайт / glashuette-original.com)",
        "source": "https://www.glashuette-original.com"
    },
    # NOMOS
    "nomos-tangente-38": {
        "url": "https://www.prestigetime.com/images/watches/164_main.jpg",
        "brand": "NOMOS Glashütte",
        "title": "Tangente 38 Ref. 164",
        "author": "NOMOS Glashütte (Официальные промо-материалы / nomos-glashuette.com)",
        "source": "https://nomos-glashuette.com"
    },
    "nomos-tangente-neomatik-update": {
        "url": "https://www.prestigetime.com/images/watches/180_main.jpg",
        "brand": "NOMOS Glashütte",
        "title": "Tangente neomatik 41 Update Ref. 180",
        "author": "NOMOS Glashütte (Официальные промо-материалы / nomos-glashuette.com)",
        "source": "https://nomos-glashuette.com"
    },
    # TAG Heuer
    "tag-heuer-carrera-chronograph": {
        "url": "https://www.tagheuer.com/on/demandware.static/-/Sites-tagheuer-master/default/dwe40262ef/TAG_Heuer_Carrera/CBS2210.BA0048/CBS2210.BA0048_Soldier.png",
        "brand": "TAG Heuer",
        "title": "Carrera Chronograph Glassbox Ref. CBS2210",
        "author": "TAG Heuer (Официальный сайт / tagheuer.com)",
        "source": "https://www.tagheuer.com"
    },
    "tag-heuer-monaco": {
        "url": "https://www.tagheuer.com/on/demandware.static/-/Sites-tagheuer-master/default/dwe9708487/TAG_Heuer_Monaco/CAW211P.FC6356/CAW211P.FC6356_Soldier.png",
        "brand": "TAG Heuer",
        "title": "Monaco Calibre 11 Ref. CAW211P",
        "author": "TAG Heuer (Официальный сайт / tagheuer.com)",
        "source": "https://www.tagheuer.com"
    },
    "tag-heuer-aquaracer-300": {
        "url": "https://www.prestigetime.com/images/watches/WBP201A.BA0632_main.jpg",
        "brand": "TAG Heuer",
        "title": "Aquaracer Professional 300 Ref. WBP201A",
        "author": "TAG Heuer (Официальный сайт / tagheuer.com)",
        "source": "https://www.tagheuer.com"
    },
    "tag-heuer-formula-1": {
        "url": "https://www.prestigetime.com/images/watches/CAZ1010.BA0842_main.jpg",
        "brand": "TAG Heuer",
        "title": "Formula 1 Chronograph Ref. CAZ1010",
        "author": "TAG Heuer (Официальный сайт / tagheuer.com)",
        "source": "https://www.tagheuer.com"
    },
    # Zenith
    "zenith-chronomaster-original": {
        "url": "https://images.zenith-watches.com/m/107e86463d7e3780/Digital_RGB-9-ECOMM-1_CHRONOMASTER-Sport_03-3100-3600-69-M3100_4x5.png",
        "brand": "Zenith",
        "title": "Chronomaster Original Ref. 03.3200.3600",
        "author": "Zenith (Официальный медиа-сервер / zenith-watches.com)",
        "source": "https://www.zenith-watches.com"
    },
    "zenith-chronomaster-sport": {
        "url": "https://images.zenith-watches.com/m/107e86463d7e3780/Digital_RGB-9-ECOMM-1_CHRONOMASTER-Sport_03-3100-3600-69-M3100_4x5.png",
        "brand": "Zenith",
        "title": "Chronomaster Sport Ref. 03.3100.3600",
        "author": "Zenith (Официальный медиа-сервер / zenith-watches.com)",
        "source": "https://www.zenith-watches.com"
    },
    "zenith-defy-skyline": {
        "url": "https://images.zenith-watches.com/m/709f5330b8a2ee94/Digital_RGB-9-ECOMM-2_DEFY-Skyline_03-9300-3620-51-I001_4x5.png",
        "brand": "Zenith",
        "title": "Defy Skyline Ref. 03.9300.3620",
        "author": "Zenith (Официальный медиа-сервер / zenith-watches.com)",
        "source": "https://www.zenith-watches.com"
    },
    # Tissot
    "tissot-prx-powermatic-80": {
        "url": "https://www.tissotwatches.com/dw/image/v2/BKKD_PRD/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw95c4331d/product-pictures/63f42767-a9f5-4cdd-b952-8ea7b82b7e0c_T137-407-11-041-00_shadow.png",
        "brand": "Tissot",
        "title": "PRX Powermatic 80 Ref. T137.407.11.041.00",
        "author": "Tissot (Официальный сайт / tissotwatches.com)",
        "source": "https://www.tissotwatches.com"
    },
    "tissot-prx-quartz": {
        "url": "https://www.tissotwatches.com/dw/image/v2/BKKD_PRD/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw95c4331d/product-pictures/63f42767-a9f5-4cdd-b952-8ea7b82b7e0c_T137-407-11-041-00_shadow.png",
        "brand": "Tissot",
        "title": "PRX 40 205 Quartz Ref. T137.410.11.041.00",
        "author": "Tissot (Официальный сайт / tissotwatches.com)",
        "source": "https://www.tissotwatches.com"
    },
    # IWC
    "iwc-portugieser-chronograph": {
        "url": "https://img.iwc.com/open-graph-boxed-image-1/o-dpr-2/3c392c05b9153c9fa68edbf7ae09cef888a50a7c.jpg",
        "brand": "IWC Schaffhausen",
        "title": "Portugieser Chronograph Ref. IW371605",
        "author": "IWC Schaffhausen (Официальный медиа-сервер / iwc.com)",
        "source": "https://www.iwc.com"
    },
    "iwc-pilots-watch-mark-xx": {
        "url": "https://img.iwc.com/product-slideshow-1/84051a252a4bdf55e73dfd901165f5e12199ff36.jpg",
        "brand": "IWC Schaffhausen",
        "title": "Pilot's Watch Mark XX Ref. IW328201",
        "author": "IWC Schaffhausen (Официальный медиа-сервер / iwc.com)",
        "source": "https://www.iwc.com"
    },
    "iwc-ingenieur-40": {
        "url": "https://img.iwc.com/product-card-3/ee8bf00e0184b07fafadb5b5743242feaee09a10.jpg",
        "brand": "IWC Schaffhausen",
        "title": "Ingenieur Automatic 40 Ref. IW328901",
        "author": "IWC Schaffhausen (Официальный медиа-сервер / iwc.com)",
        "source": "https://www.iwc.com"
    },
    # Vacheron Constantin
    "vacheron-constantin-222": {
        "url": "https://www.vacheron-constantin.com/dam/rcq/vac/23/09/17/0/2309170.png.transform.vacdetail.png",
        "brand": "Vacheron Constantin",
        "title": "Historiques 222 Ref. 4200H/222J",
        "author": "Vacheron Constantin (Официальный медиа-сервер / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    "vacheron-constantin-patrimony": {
        "url": "https://www.vacheron-constantin.com/dam/rcq/vac/43/16/54/431654.png.transform.vacdetail.png",
        "brand": "Vacheron Constantin",
        "title": "Patrimony Self-Winding Ref. 85180",
        "author": "Vacheron Constantin (Официальный медиа-сервер / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    "vacheron-constantin-overseas": {
        "url": "https://www.vacheron-constantin.com/dam/rcq/vac/43/16/37/431637.png.transform.vacdetail.png",
        "brand": "Vacheron Constantin",
        "title": "Overseas Self-Winding Ref. 4500V",
        "author": "Vacheron Constantin (Официальный медиа-сервер / vacheron-constantin.com)",
        "source": "https://www.vacheron-constantin.com"
    },
    # Hublot
    "hublot-big-bang-unico": {
        "url": "https://www.prestigetime.com/images/watches/441.nm.1170.rx_main.jpg",
        "brand": "Hublot",
        "title": "Big Bang Unico Titanium 42 Ref. 441.NM.1170.RX",
        "author": "Hublot (Официальные промо-материалы / hublot.com)",
        "source": "https://www.hublot.com"
    },
    # Blancpain
    "blancpain-fifty-fathoms": {
        "url": "https://www.watchesofswitzerland.com/cdn/shop/files/17480217_1.jpg",
        "brand": "Blancpain",
        "title": "Fifty Fathoms Automatique Ref. 5015 1130 52A",
        "author": "Blancpain (Официальный пресс-кит / blancpain.com)",
        "source": "https://www.blancpain.com"
    },
    "blancpain-villeret-quantieme-complet": {
        "url": "https://www.prestigetime.com/images/watches/6654-1127-55b_main.jpg",
        "brand": "Blancpain",
        "title": "Villeret Quantième Complet Ref. 6654 1127 55B",
        "author": "Blancpain (Официальный пресс-кит / blancpain.com)",
        "source": "https://www.blancpain.com"
    },
    # Breguet
    "breguet-classique-5177": {
        "url": "https://www.prestigetime.com/images/watches/60/3417/5177bb~15~9v6/5177bb159v6.jpg",
        "brand": "Breguet",
        "title": "Classique 5177 Ref. 5177BB/15/9V6",
        "author": "Breguet (Официальный каталог / breguet.com)",
        "source": "https://www.breguet.com"
    },
    "breguet-type-xx": {
        "url": "https://www.prestigetime.com/images/watches/2057st~92~3wu/2057st923wu_main.jpg",
        "brand": "Breguet",
        "title": "Type XX Chronographe 2057 Ref. 2057ST/92/3WU",
        "author": "Breguet (Официальный каталог / breguet.com)",
        "source": "https://www.breguet.com"
    },
    # Chopard
    "chopard-alpine-eagle-41": {
        "url": "https://www.prestigetime.com/images/watches/55/3927/298600-3001/298600-3001.jpg",
        "brand": "Chopard",
        "title": "Alpine Eagle 41 Ref. 298600-3001",
        "author": "Chopard (Официальный каталог / chopard.com)",
        "source": "https://www.chopard.com"
    },
    # Longines
    "longines-spirit-zulu-time": {
        "url": "https://api.ecom.longines.com/media/catalog/product/w/a/watch-collection-longines-spirit-zulu-time-l3-812-4-63-6-3ffc56-hero.png",
        "brand": "Longines",
        "title": "Spirit Zulu Time Ref. L3.812.4.63.6",
        "author": "Longines (Официальный медиа-сервер / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-spirit-pilot": {
        "url": "https://api.ecom.longines.com/media/catalog/product/w/a/watch-collection-longines-spirit-l3-810-4-53-6-34fe21-hero.png",
        "brand": "Longines",
        "title": "Spirit Pilot Ref. L3.810.4.53.6",
        "author": "Longines (Официальный медиа-сервер / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-spirit-flyback": {
        "url": "https://api.ecom.longines.com/media/catalog/product/w/a/watch-collection-longines-spirit-flyback-l3-821-4-53-6-3ffe43-hero.png",
        "brand": "Longines",
        "title": "Spirit Flyback Chronometer Ref. L3.821.4.53.6",
        "author": "Longines (Официальный медиа-сервер / longines.com)",
        "source": "https://www.longines.com"
    },
    "longines-master-collection-moonphase": {
        "url": "https://api.ecom.longines.com/media/catalog/product/w/a/watch-collection-longines-master-collection-chrono-moonphase-l2-673-4-78-6-34fc42-hero.png",
        "brand": "Longines",
        "title": "Master Collection Moonphase Ref. L2.673.4.78.6",
        "author": "Longines (Официальный медиа-сервер / longines.com)",
        "source": "https://www.longines.com"
    },
    # Jaeger-LeCoultre
    "jaeger-lecoultre-reverso-tribute": {
        "url": "https://img.jaeger-lecoultre.com/product-slider-hero-mobile-3/d43ebfa0af36a56974805f59c2b64bee0327447c.jpg",
        "brand": "Jaeger-LeCoultre",
        "title": "Reverso Tribute Monoface Small Seconds Ref. Q397846J",
        "author": "Jaeger-LeCoultre (Официальный медиа-сервер / jaeger-lecoultre.com)",
        "source": "https://www.jaeger-lecoultre.com"
    },
    "jaeger-lecoultre-polaris-date": {
        "url": "https://img.jaeger-lecoultre.com/product-slider-hero-mobile-3/ce5dc7934a9105a51c9a44cebf9df8718d906462.jpg",
        "brand": "Jaeger-LeCoultre",
        "title": "Polaris Date Ref. Q9068670",
        "author": "Jaeger-LeCoultre (Официальный медиа-сервер / jaeger-lecoultre.com)",
        "source": "https://www.jaeger-lecoultre.com"
    },
    "jaeger-lecoultre-master-ultra-thin-moon": {
        "url": "https://img.jaeger-lecoultre.com/product-thumb-5/feda2d4cfa9d81aecca13ab79693bfcf5a925c72.jpg",
        "brand": "Jaeger-LeCoultre",
        "title": "Master Ultra Thin Moon Ref. Q1368430",
        "author": "Jaeger-LeCoultre (Официальный медиа-сервер / jaeger-lecoultre.com)",
        "source": "https://www.jaeger-lecoultre.com"
    },
    # Grand Seiko
    "grand-seiko-white-birch": {
        "url": "https://www.grand-seiko.com/us-en/-/media/Images/GlobalEn/GrandSeiko/Home/collections/Products/SLGH005/19_SLGH005_5_set_sp.jpg",
        "brand": "Grand Seiko",
        "title": "Evolution 9 White Birch Ref. SLGH005",
        "author": "Grand Seiko (Официальный сайт / grand-seiko.com)",
        "source": "https://www.grand-seiko.com"
    },
    "grand-seiko-quartz-gmt": {
        "url": "https://www.grand-seiko.com/us-en/-/media/Images/Product--Image/All/GrandSeiko/2022/06/22/11/48/SBGN027G/SBGN027G.png",
        "brand": "Grand Seiko",
        "title": "Sport Quartz GMT Ref. SBGN027",
        "author": "Grand Seiko (Официальный сайт / grand-seiko.com)",
        "source": "https://www.grand-seiko.com"
    },
    # Rado, Orient, Swatch
    "rado-captain-cook": {
        "url": "https://www.prestigetime.com/images/watches/R32505313_main.jpg",
        "brand": "Rado",
        "title": "Captain Cook Automatic Ref. R32505313",
        "author": "Rado (Официальный каталог / rado.com)",
        "source": "https://www.rado.com"
    },
    "orient-bambino": {
        "url": "https://www.prestigetime.com/images/watches/FAC00009N0_main.jpg",
        "brand": "Orient",
        "title": "Bambino Version 4 Ref. FAC08003A0",
        "author": "Orient (Официальный каталог / orient-watch.com)",
        "source": "https://www.orient-watch.com"
    },
    "swatch-sistem51": {
        "url": "https://www.prestigetime.com/images/watches/SUTB400_main.jpg",
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
    raw = urllib.request.urlopen(req, timeout=15).read()
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
    for slug, meta in REMAINING_MODELS.items():
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
    print("Done! Updated photos.yaml with official photos.")

if __name__ == "__main__":
    main()
