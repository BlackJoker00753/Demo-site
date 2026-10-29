"""Measure a public response and its repetitions without keeping a service awake."""

import argparse
import json
import time

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", nargs="?", default="https://horologium-szy5.onrender.com/watch/rolex-submariner")
    parser.add_argument("--samples", type=int, default=3)
    args = parser.parse_args()
    results = []
    with httpx.Client(timeout=90, follow_redirects=True) as client:
        for index in range(max(1, min(args.samples, 5))):
            start = time.perf_counter()
            try:
                response = client.get(args.url)
                result = {"request": index + 1, "status": response.status_code, "seconds": round(time.perf_counter() - start, 3)}
            except httpx.HTTPError as error:
                result = {"request": index + 1, "error": type(error).__name__, "seconds": round(time.perf_counter() - start, 3)}
            results.append(result)
    print(json.dumps({"url": args.url, "note": "Полное время ответа HTTP, не время появления интерфейса. Первый запрос не обязательно холодный.", "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
