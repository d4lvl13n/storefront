#!/usr/bin/env python3
"""
Expand per-product placeholder rows from parse_perplexity_research.py into
per-variant rows ready for import_products.py.

Input:
  products_NEW.csv  (one row per product, placeholder variant = "TBD — edit before import")

Output:
  products_SEED.csv (one row per SKU, real SKU codes, wholesale cost populated,
                     stock populated, retail price = 0.00, is_published = false)

Rationale:
  - Product descriptions, SEO, and categories are locked in from Perplexity research.
  - SKU codes, wholesale costs, and stock come from the hkroids supplier invoice
    (INV-0150184, April 2026).
  - Retail prices are a client business decision — left at $0.00 for the client
    to fill in via the Saleor admin dashboard after seeding.
  - is_published = false keeps every product hidden from the public storefront
    until the client reviews prices and flips the toggle per SKU.

Products researched but NOT on the client's launch SKU list are skipped here
(Cagrilintide, LL-37, KPV). Their content is preserved in products_NEW.csv +
seo_NEW.csv for a future inventory expansion.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

# ─────────────────────────────────────────────────────────────────────
# Variant map — product_slug → list of variants from the hkroids invoice
# (INV-0150184, April 2026) + the client's launch SKU list.
#
# cost_usd:   wholesale cost per vial (kit price ÷ 10 vials per kit).
#             0 = SKU is on the client's launch list but was not in
#             the current invoice; client will update in admin.
# stock:      initial stock (kits ordered × 10 vials/kit).
# ─────────────────────────────────────────────────────────────────────

VARIANTS: dict[str, list[dict]] = {
    "retatrutide": [
        {"label": "10mg Vial", "sku": "RT10", "cost_usd": 12.90, "stock": 70},
        {"label": "20mg Vial", "sku": "RT20", "cost_usd": 24.30, "stock": 30},
        {"label": "40mg Vial", "sku": "RT40", "cost_usd": 0.00, "stock": 0},
        {"label": "60mg Vial", "sku": "RT60", "cost_usd": 0.00, "stock": 0},
    ],
    "semaglutide": [
        {"label": "10mg Vial", "sku": "SM10", "cost_usd": 6.30, "stock": 50},
        {"label": "20mg Vial", "sku": "SM20", "cost_usd": 0.00, "stock": 0},
        {"label": "30mg Vial", "sku": "SM30", "cost_usd": 0.00, "stock": 0},
    ],
    "tirzepatide": [
        {"label": "10mg Vial", "sku": "TR10", "cost_usd": 6.90, "stock": 40},
        {"label": "20mg Vial", "sku": "TR20", "cost_usd": 11.40, "stock": 40},
        {"label": "40mg Vial", "sku": "TR40", "cost_usd": 0.00, "stock": 0},
        {"label": "60mg Vial", "sku": "TR60", "cost_usd": 22.90, "stock": 20},
    ],
    "bpc-157": [
        {"label": "10mg Vial", "sku": "BC10", "cost_usd": 7.40, "stock": 100},
    ],
    "tb-500-thymosin-beta-4": [
        {"label": "10mg Vial", "sku": "BT10", "cost_usd": 18.60, "stock": 100},
    ],
    "pt-141-bremelanotide": [
        {"label": "10mg Vial", "sku": "P41", "cost_usd": 7.40, "stock": 100},
    ],
    "kisspeptin-10": [
        {"label": "10mg Vial", "sku": "KS10", "cost_usd": 11.40, "stock": 100},
    ],
    "ghk-cu": [
        {"label": "50mg Vial", "sku": "CU50", "cost_usd": 3.40, "stock": 100},
    ],
    "mots-c": [
        {"label": "10mg Vial", "sku": "MS10", "cost_usd": 7.10, "stock": 100},
    ],
    "cjc-1295-with-dac": [
        # Client launch list SKU CD5; not on current invoice.
        {"label": "5mg Vial", "sku": "CD5", "cost_usd": 0.00, "stock": 0},
    ],
    "sermorelin": [
        # Invoice uses SMO-10; storefront SKU normalized to SMO10 (no dash).
        {"label": "10mg Vial", "sku": "SMO10", "cost_usd": 15.10, "stock": 100},
    ],
    "tesamorelin": [
        {"label": "10mg Vial", "sku": "TSM10", "cost_usd": 22.30, "stock": 100},
    ],
    "epithalon": [
        # Client launch list SKU ET10; not on current invoice.
        {"label": "10mg Vial", "sku": "ET10", "cost_usd": 0.00, "stock": 0},
    ],
    "ipamorelin": [
        {"label": "10mg Vial", "sku": "IP10", "cost_usd": 7.40, "stock": 100},
    ],
    "nad-plus": [
        # Client launch list SKU "NAD 500"; normalized to NAD500.
        # Invoice SKU NJ500; using the customer-facing "NAD500" here.
        {"label": "500mg Vial", "sku": "NAD500", "cost_usd": 8.60, "stock": 100},
    ],
    "semax": [
        {"label": "10mg Vial", "sku": "XA10", "cost_usd": 10.00, "stock": 100},
    ],
    "oxytocin": [
        # Client launch list SKU OT10; not on current invoice.
        {"label": "10mg Vial", "sku": "OT10", "cost_usd": 0.00, "stock": 0},
    ],
    "selank": [
        {"label": "10mg Vial", "sku": "SK10", "cost_usd": 10.00, "stock": 100},
    ],
    "bacteriostatic-water": [
        # Sold by the vial, not by kit. Invoice has 50 vials @ $10 each.
        {"label": "10mL Vial", "sku": "BA10", "cost_usd": 10.00, "stock": 50},
    ],
    "5-amino-1mq": [
        {"label": "5mg Vial", "sku": "5AM", "cost_usd": 5.70, "stock": 100},
    ],
    "bpc-157-tb-500-blend": [
        {"label": "5mg + 5mg Vial", "sku": "BB10", "cost_usd": 14.10, "stock": 30},
        {"label": "10mg + 10mg Vial", "sku": "BB20", "cost_usd": 26.70, "stock": 20},
    ],
    "glow-blend-bpc-157-tb-500-ghk-cu": [
        {"label": "10mg BPC + 10mg TB500 + 50mg GHK-Cu Vial", "sku": "BBG70", "cost_usd": 28.30, "stock": 30},
    ],
    "cjc-1295-ipamorelin-blend": [
        {"label": "5mg CJC + 5mg Ipa Vial", "sku": "CP10", "cost_usd": 13.20, "stock": 20},
    ],
}

# Product slugs that were researched but are NOT on the launch list.
# They remain in products_NEW.csv / seo_NEW.csv for a future inventory wave.
SKIP_FROM_LAUNCH = {"cagrilintide", "ll-37", "kpv"}

# Default weight per vial (in kg). Can be refined per-product later.
DEFAULT_WEIGHT_KG = "0.05"


def expand(
    input_path: Path,
    output_path: Path,
    include_unlisted: bool,
) -> tuple[int, int, int]:
    """Expand product rows into variant rows.

    Returns (products_processed, variants_written, products_skipped).
    """
    variants_written = 0
    products_processed = 0
    products_skipped = 0
    unknown_slugs: list[str] = []

    with open(input_path, newline="", encoding="utf-8") as fin:
        reader = csv.DictReader(fin)
        fieldnames = reader.fieldnames or []

        with open(output_path, "w", newline="", encoding="utf-8") as fout:
            writer = csv.DictWriter(fout, fieldnames=fieldnames)
            writer.writeheader()

            for row in reader:
                slug = row.get("product_slug", "").strip()
                products_processed += 1

                if slug in SKIP_FROM_LAUNCH and not include_unlisted:
                    products_skipped += 1
                    print(f"  [skip — not on launch list] {row.get('product_name')}")
                    continue

                variants = VARIANTS.get(slug)
                if not variants:
                    unknown_slugs.append(slug)
                    products_skipped += 1
                    print(f"  [skip — no variant map] {row.get('product_name')} (slug: {slug})")
                    continue

                for variant in variants:
                    new_row = dict(row)
                    new_row["variant_name"] = variant["label"]
                    new_row["sku"] = variant["sku"]
                    # Retail price: leave at 0.00. Client fills in Saleor admin.
                    new_row["price_usd"] = "0.00"
                    # Cost price: populated from invoice when available.
                    new_row["cost_price_usd"] = f"{variant['cost_usd']:.2f}"
                    new_row["stock_quantity"] = str(variant["stock"])
                    new_row["weight_kg"] = DEFAULT_WEIGHT_KG
                    # Published flag: OFF until client reviews prices.
                    new_row["is_published"] = "false"
                    writer.writerow(new_row)
                    variants_written += 1

    if unknown_slugs:
        print()
        print("WARNING: slugs with no entry in VARIANTS map:")
        for s in unknown_slugs:
            print(f"  - {s}")
        print(
            "Either add these to the VARIANTS map at the top of this script, "
            "or accept that they will not be seeded in this pass."
        )

    return products_processed, variants_written, products_skipped


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument(
        "--input",
        type=Path,
        default=SCRIPT_DIR / "products_NEW.csv",
        help="Product-level CSV from parse_perplexity_research.py",
    )
    ap.add_argument(
        "--output",
        type=Path,
        default=SCRIPT_DIR / "products_SEED.csv",
        help="Variant-expanded CSV ready for import_products.py",
    )
    ap.add_argument(
        "--include-unlisted",
        action="store_true",
        help=(
            "Include products that were researched but are not on the launch list "
            "(Cagrilintide, LL-37, KPV). Requires adding them to the VARIANTS map."
        ),
    )
    args = ap.parse_args()

    if not args.input.exists():
        print(f"ERROR: input file not found: {args.input}", file=sys.stderr)
        return 1

    processed, written, skipped = expand(args.input, args.output, args.include_unlisted)

    print()
    print("=" * 60)
    print(f"  Products processed : {processed}")
    print(f"  Products skipped   : {skipped}")
    print(f"  Variants written   : {written}")
    print(f"  Output             : {args.output}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
