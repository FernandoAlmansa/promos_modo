#!/usr/bin/env python3
"""Ingesta diaria de promociones MODO -> public/data/{promos,bancos}.json.

Solo stdlib. Sale con código != 0 (y sin tocar los JSON) si algo falla o si
vienen menos de MIN_PROMOS promos, así el workflow no deploya datos malos.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://www.modo.com.ar/promos/api/rewards"
BANKS_URL = f"{BASE}/banks?source=app_modo"  # catálogo v1 (82 bancos); v2 trae solo 32
CATEGORIES_URL = f"{BASE}/categories?source=app_modo"
SLOT_IDS = ",".join([
    "web-modo-hub-carrousel_principal",
    "web-modo-hub-destacadas",
    "web-modo-hub-supermercados",
    "web-modo-hub-exclusivas-online",
    "web-modo-hub-promos-financiacion",
    "web-modo-hub-mas-promos",
])  # NO quitar: sin slot_ids devuelve ~26000 con datos de prueba
PROMOS_URL = (f"{BASE}/v2/filter?slot_ids={SLOT_IDS}&limit=100&page={{page}}"
              "&source=web_modo&origin=WEB_MODO")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36")
SLEEP = 0.7
MIN_PROMOS = 1000
MAX_PAGES = 80  # corte de seguridad

OUT_DIR = Path(__file__).resolve().parent.parent / "data"

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
# flows de MODO -> canal normalizado
FLOW_MAP = {
    "instore": "p", "physical-card": "p", "trip": "p",   # presencial
    "online": "o", "telepase": "o",                     # online
    "instore_nfc": "n",                                 # NFC
}
PM_TYPE = {"credit_card": "c", "debit_card": "d", "pct": "t"}  # t = transferencia (PCT)


class IngestError(Exception):
    pass


def get_json(url: str, retries: int = 4):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "es-AR,es;q=0.9",
                "Referer": "https://www.modo.com.ar/promos",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
            return json.loads(body)
        except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
            last = e
            wait = 2 ** attempt * 2
            print(f"  ! {e!r} -> reintento en {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise IngestError(f"no se pudo bajar {url}: {last!r}")


def fetch_banks():
    data = get_json(BANKS_URL)
    if not isinstance(data, list) or len(data) < 30:
        raise IngestError(f"catálogo de bancos inesperado ({type(data).__name__}, {len(data) if isinstance(data, list) else '-'})")
    banks = [{"id": b["id"], "name": b["name"].strip(), "image": b.get("image"),
              "code": b.get("hub_bank_id")} for b in data if b.get("id") and b.get("name")]
    banks.sort(key=lambda b: b["name"].lower())
    return banks


def fetch_categories():
    try:
        data = get_json(CATEGORIES_URL)
        cats = {str(c["id"]): {"t": c["title"], "i": c.get("text_icon") or ""} for c in data}
    except (IngestError, KeyError, TypeError) as e:  # no crítico
        print(f"  ! categorías no disponibles: {e!r}", file=sys.stderr)
        cats = {}
    cats.setdefault("0", {"t": "Otros", "i": "🏷️"})
    return cats


def fetch_cards():
    cards: dict[str, dict] = {}
    page, total_pages, total_results = 1, None, None
    while True:
        data = get_json(PROMOS_URL.format(page=page))
        if not isinstance(data, dict) or "cards" not in data or "pagination" not in data:
            raise IngestError(f"respuesta inesperada en página {page}")
        pag = data["pagination"]
        total_pages = int(pag["total_pages"])
        total_results = int(pag["total_results"])
        for c in data["cards"]:
            cards[c["benefit"]["id"]] = c  # dedupe por benefit.id
        print(f"  página {page}/{total_pages}: {len(data['cards'])} cards (únicas {len(cards)})")
        if page >= total_pages or page >= MAX_PAGES or not data["cards"]:
            break
        page += 1
        time.sleep(SLEEP)
    return list(cards.values()), total_results


def _num(x):
    try:
        v = float(x)
        return int(v) if v.is_integer() else v
    except (TypeError, ValueError):
        return 0


def _hhmm(t):
    return (t or "")[:5]


def normalize(c: dict) -> dict | None:
    if c.get("calculated_status") == "FINISHED_FOR_PRODUCT":
        return None
    b, o, card = c["benefit"], c.get("offer") or {}, c.get("card") or {}
    cond = b.get("conditions") or {}
    sch = cond.get("schedule") or {}
    outc = o.get("outcomes") or {}
    lim = o.get("limits") or {}
    req = o.get("requirements") or {}

    sd, ed = sch.get("start_date"), sch.get("stop_date")
    if not sd or not ed:
        return None
    days = sorted({DAYS.index(d) for d in (sch.get("days_of_week") or []) if d in DAYS})
    if not days:
        days = list(range(7))

    p = {
        "id": b["id"],
        "n": (b.get("name") or "").strip(),
        "t": b.get("type"),
        "pl": (card.get("validity_place") or "").strip(),
        "bt": (card.get("benefit") or "").strip(),
        "img": card.get("image"),
        "sl": (b.get("publication") or {}).get("slug"),
        "sc": b.get("scope"),
        "s": "N" if c.get("calculated_status") == "NEXT_FOR_PRODUCT" else "R",
        "sd": sd, "ed": ed, "d": days,
    }
    hs, he = _hhmm(sch.get("daily_start_time")), _hhmm(sch.get("daily_stop_time"))
    if hs and he and not (hs == "00:00" and he >= "23:59"):
        p["h"] = [hs, he]

    flows = (cond.get("payment_flow") or {}).get("flows") or []
    ch = set()
    for f in flows:
        if f == "all":
            ch |= {"p", "o", "n"}
        elif f in FLOW_MAP:
            ch.add(FLOW_MAP[f])
    p["ch"] = sorted(ch) if ch else ["p", "o", "n"]

    pms = []
    for m in (cond.get("payment_methods") or {}).get("methods") or []:
        t = PM_TYPE.get(m.get("type"))
        if not t:
            continue
        pms.append("t" if t == "t" else f"{t}:{m.get('issuer') or '?'}")
    if pms:
        p["pm"] = sorted(set(pms))

    cb = outc.get("cashback") or {}
    if cb.get("amount"):
        p["cb"] = _num(cb["amount"])
        if cb.get("amount_type") == "fixed":
            p["cbf"] = 1
    inst = [int(i["number"]) for i in (outc.get("financing") or {}).get("installments") or []
            if i.get("type") == "sin_interes" and _num(i.get("number")) > 1]
    if inst:
        p["q"] = max(inst)

    pc = lim.get("period_cap") or {}
    cap = _num(pc.get("amount_by_period")) or _num(card.get("cashback_cap"))
    if cap:
        p["cap"] = cap
        if pc.get("reset_by"):
            p["capr"] = pc["reset_by"]
        if pc.get("aggregate_by"):
            p["capa"] = pc["aggregate_by"]
    tx = _num((lim.get("transaction_cap") or {}).get("amount_by_transaction"))
    if tx:
        p["tx"] = tx
    mn = _num((req.get("amount_range") or {}).get("min"))
    if mn:
        p["min"] = mn

    p["b"] = list(dict.fromkeys((req.get("banks") or {}).get("list") or []))
    p["cat"] = [str(x) for x in (o.get("categories") or [])] or ["0"]
    return p


def write_json(path: Path, obj):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    try:
        print("Bancos…")
        banks = fetch_banks()
        time.sleep(SLEEP)
        print("Rubros…")
        cats = fetch_categories()
        time.sleep(SLEEP)
        print("Promos…")
        raw, total = fetch_cards()
        if len(raw) < MIN_PROMOS:
            raise IngestError(f"solo {len(raw)} promos (mínimo {MIN_PROMOS}); total_results={total}")
        promos, errors = [], 0
        for c in raw:
            try:
                p = normalize(c)
            except (KeyError, TypeError, ValueError, AttributeError) as e:
                errors += 1
                print(f"  ! no se pudo normalizar {c.get('benefit', {}).get('id')}: {e!r}", file=sys.stderr)
                continue
            if p:
                promos.append(p)
        if errors > len(raw) * 0.05:
            raise IngestError(f"{errors} promos fallaron al normalizar (>5%)")
        if len(promos) < MIN_PROMOS // 2:
            raise IngestError(f"solo {len(promos)} promos vigentes tras filtrar")
    except (IngestError, KeyError, TypeError, ValueError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    known = {b["id"] for b in banks}
    unknown = {x for p in promos for x in p["b"] if x not in known}
    if unknown:
        print(f"  aviso: {len(unknown)} bancos sin catálogo", file=sys.stderr)

    for p in promos:  # rubros fuera del catálogo -> "Otros"
        p["cat"] = list(dict.fromkeys(c if c in cats else "0" for c in p["cat"]))
    promos.sort(key=lambda p: (-(0 if p.get("cbf") else p.get("cb") or 0), -(p.get("q") or 0), p["pl"].lower()))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write_json(OUT_DIR / "bancos.json", {"generated_at": now, "banks": banks})
    write_json(OUT_DIR / "promos.json", {
        "generated_at": now, "source_total": total, "raw": len(raw),
        "count": len(promos), "categories": cats, "promos": promos,
    })
    size = (OUT_DIR / "promos.json").stat().st_size
    print(f"OK: {len(raw)} únicas, {len(promos)} vigentes, {len(banks)} bancos, promos.json {size/1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
