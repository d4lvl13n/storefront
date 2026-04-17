#!/usr/bin/env python3
"""
Parse Perplexity research output into import-ready CSVs.

Input  : text stream containing one or more ---PRODUCT START--- / ---PRODUCT END---
         blocks (the format produced by the Perplexity Deep Research prompt
         maintained alongside this script).

Outputs:
  - products CSV  : one placeholder-variant row per product, matching the
                    schema expected by import_products.py
                    (infinitybio_products_catalog.csv)
  - SEO CSV       : one row per product, matching import_seo.py
                    (infinitybio_products_seo_test.csv)
  - compliance report (Markdown) : per-product pass/warn/error,
                                    category + type validation, banned-term
                                    hits, SEO length checks, override notes

Features:
  - Strips [web:\\d+] footnote markers from every text field
  - Validates `category` and `product_type` against the admin-CC taxonomy
    (values sourced from import_products.py so there is one source of truth)
  - Splits Perplexity's 3-paragraph description into description_p1/p2/p3
    for the SEO CSV, and joins them into a single string for the products CSV
  - Optional --overrides JSON file can force category / product_type per
    product name (useful when Perplexity's pharmacology-based categorisation
    conflicts with the admin catalog's merchandising grouping — e.g.
    Cagrilintide belongs in "GLP-1 Receptor Agonists" in the catalog even
    though it is mechanistically an amylin analog)
  - Hard-banned terms from the Frier Levitt memo cause ERROR-level issues
    and skip the product from CSV output.
  - Soft-warning terms cause WARN but still emit the CSV row.
  - Blocks tagged `status: INSUFFICIENT_DATA` are reported but skipped.

Usage:
    python3 parse_perplexity_research.py --input batch1.txt
    cat batch1.txt | python3 parse_perplexity_research.py

Typical workflow:
    # 1. Paste Perplexity output into batch1.txt
    # 2. Run the parser
    python3 parse_perplexity_research.py --input batch1.txt \\
        --overrides overrides.json \\
        --output-products products_NEW.csv \\
        --output-seo seo_NEW.csv \\
        --report parse_report.md
    # 3. Review parse_report.md
    # 4. Fix anything flagged, re-run if needed
    # 5. Merge products_NEW.csv + seo_NEW.csv into the live catalog CSVs
    #    (adding real variant/price/SKU data from the client spec)
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent

# Pull taxonomy from import_products.py so there's one source of truth.
# Fallback to hardcoded values if the import fails for any reason.
try:
    sys.path.insert(0, str(SCRIPT_DIR))
    from import_products import CATEGORIES, COLLECTIONS, PRODUCT_TYPES
except Exception:  # noqa: BLE001
    CATEGORIES = [
        "GLP-1 Receptor Agonists",
        "Growth Hormone Secretagogues",
        "Growth Hormone Derivatives",
        "Growth Factors",
        "Cytoprotective Peptides",
        "Thymic Peptides",
        "Melanocortin Receptor Modulators",
        "Copper Peptide Complexes",
        "Mitochondrial Peptides",
        "Pineal Peptides",
        "Nootropic Peptides",
        "Antimicrobial Peptides",
        "Neuropeptides",
        "Reproductive Hormones",
        "Research Small Molecules",
        "Peptide Blends",
        "Reference Peptides (Miscellaneous)",
        "Cosmetic Injectables",
        "Metabolic Injectables",
        "Supplies",
    ]
    PRODUCT_TYPES = [
        "Peptide",
        "Peptide Blend",
        "Hormone",
        "Injectable",
        "Injectable Blend",
        "Supply",
    ]
    COLLECTIONS = ["Best Sellers", "Featured Products", "Research Accessories"]

ALLOWED_CATEGORIES = set(CATEGORIES)
ALLOWED_PRODUCT_TYPES = set(PRODUCT_TYPES)
ALLOWED_COLLECTIONS = set(COLLECTIONS) | {""}

# ─────────────────────────────────────────────────────────────────────
# Regex primitives
# ─────────────────────────────────────────────────────────────────────

BLOCK_RE = re.compile(r"---PRODUCT START---(.+?)---PRODUCT END---", re.DOTALL)
FIELD_RE = re.compile(r"^([a-z][a-z0-9_]*): ?(.*)$")
WEB_MARKER_RE = re.compile(r"\s*\[web:\d+\]")
MULTISPACE_RE = re.compile(r" {2,}")

# Exhaustive list of valid top-level keys in a product block.
# A line is treated as a field boundary ONLY if its key is in this set —
# this prevents sentences inside a description from being misread as new
# fields (a risk when description text happens to start with a lowercase
# word followed by a colon, e.g. code snippets).
KNOWN_KEYS = frozenset([
    "product_name", "product_slug", "alt_names",
    "category", "product_type",
    "description", "seo_title", "seo_description",
    "purity", "form", "storage",
    "molecular_weight", "cas_number", "sequence",
    "origin", "solubility", "research_category",
    "faq_1_q", "faq_1_a",
    "faq_2_q", "faq_2_a",
    "faq_3_q", "faq_3_a",
    "faq_4_q", "faq_4_a",
    "faq_5_q", "faq_5_a",
    "ref_1", "ref_2", "ref_3",
    "status",  # only for INSUFFICIENT_DATA stubs
])

# ─────────────────────────────────────────────────────────────────────
# Compliance rules — Frier Levitt memo banned terms
# ─────────────────────────────────────────────────────────────────────

# Hard-banned exact phrases (case-insensitive substring match).
# Any of these in description/seo text → ERROR, product skipped from CSV.
HARD_BANNED_PHRASES = [
    # Weight / metabolism benefit claims
    "weight loss", "weight management", "fat loss", "fat reduction",
    "appetite suppression",
    # Muscle / performance benefit claims
    "muscle growth", "muscle gain", "lean mass", "bulk up",
    "athletic performance", "enhanced performance",
    "post-workout recovery", "exercise recovery",
    # Sexual / endocrine benefit claims
    "sexual function", "sexual performance", "sexual health",
    "erectile function", "libido enhancement",
    # Immune / wellness benefit claims
    "immune support", "immune function enhancement", "immunity boost",
    "joint health", "skin health", "hair growth",
    "sleep quality", "mental clarity", "reduces anxiety", "reduces stress",
    # Anti-aging benefit claims
    "anti-aging", "antiaging", "anti aging", "youthful appearance",
    "reduces wrinkles", "age reversal",
    # Drug-equivalence / comparative claims
    "like ozempic", "like mounjaro", "like wegovy", "like botox",
    "alternative to ozempic", "alternative to mounjaro",
    "replacement for", "equivalent to",
    # FDA-prohibited disease claims
    "diagnose", "treat", "cure", "prevent disease",
    "for diabetes", "for obesity", "for alzheimer",
]

# Hard-banned standalone words (whole-word, case-insensitive)
HARD_BANNED_WORDS = [
    "longevity", "rejuvenation", "vitality", "libido",
    "ozempic", "mounjaro", "wegovy", "zepbound", "vyleesi", "botox",
    "saxenda", "trulicity", "byetta",
]

# Soft warnings — context-dependent. Flag for human review, do not block.
SOFT_WARNING_TERMS = [
    "recovery", "healing", "remodelling", "remodeling",
    "stress resistance", "stress relief",
    "enhances", "boosts",
    "mood", "anxiety", "depression",
]

# ─────────────────────────────────────────────────────────────────────
# Data structures
# ─────────────────────────────────────────────────────────────────────


@dataclass
class ParseIssue:
    level: str  # "ERROR" | "WARN" | "INFO"
    message: str


@dataclass
class ParsedProduct:
    data: dict[str, str] = field(default_factory=dict)
    issues: list[ParseIssue] = field(default_factory=list)
    override_notes: list[str] = field(default_factory=list)
    is_skipped: bool = False
    skip_reason: str = ""

    @property
    def has_errors(self) -> bool:
        return any(i.level == "ERROR" for i in self.issues)

    @property
    def has_warnings(self) -> bool:
        return any(i.level == "WARN" for i in self.issues)


# ─────────────────────────────────────────────────────────────────────
# Parsing
# ─────────────────────────────────────────────────────────────────────


def extract_blocks(text: str) -> list[str]:
    return [m.group(1).strip() for m in BLOCK_RE.finditer(text)]


def parse_block(block_text: str) -> dict[str, str]:
    """Parse a single ---PRODUCT START---/---PRODUCT END--- block into fields."""
    data: dict[str, list[str]] = {}
    current_key: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        if current_key is not None:
            data[current_key] = buffer[:]

    for line in block_text.split("\n"):
        m = FIELD_RE.match(line)
        if m and m.group(1) in KNOWN_KEYS:
            flush()
            current_key = m.group(1)
            buffer = [m.group(2)]
        else:
            if current_key is not None:
                buffer.append(line)
    flush()

    # Collapse each field's buffer into a trimmed string.
    return {k: "\n".join(v).strip() for k, v in data.items()}


def strip_web_markers(text: str) -> str:
    if not text:
        return text
    out = WEB_MARKER_RE.sub("", text)
    out = MULTISPACE_RE.sub(" ", out)
    return out.strip()


def split_description_paragraphs(description: str) -> list[str]:
    """
    Split a description into paragraphs suitable for description_p1/p2/p3.
    Strips trailing RUO disclaimer and merges it into the last paragraph.
    Returns up to 3 non-empty paragraph strings.
    """
    raw = [p.strip() for p in re.split(r"\n\s*\n", description) if p.strip()]
    # Collapse to at most 3 paragraphs: if more, join the tail.
    if len(raw) > 3:
        raw = raw[:2] + ["\n\n".join(raw[2:])]
    return raw


# ─────────────────────────────────────────────────────────────────────
# Compliance checks
# ─────────────────────────────────────────────────────────────────────


def check_banned_terms(text: str) -> list[tuple[str, str]]:
    """Return list of (term, kind) tuples for banned hits."""
    hits: list[tuple[str, str]] = []
    if not text:
        return hits
    lower = text.lower()
    for phrase in HARD_BANNED_PHRASES:
        if phrase in lower:
            hits.append((phrase, "phrase"))
    for word in HARD_BANNED_WORDS:
        if re.search(rf"\b{re.escape(word)}\b", lower):
            hits.append((word, "word"))
    return hits


def check_soft_warnings(text: str) -> list[str]:
    hits: list[str] = []
    if not text:
        return hits
    lower = text.lower()
    for term in SOFT_WARNING_TERMS:
        if re.search(rf"\b{re.escape(term)}\b", lower):
            hits.append(term)
    return hits


def validate(data: dict[str, str]) -> list[ParseIssue]:
    issues: list[ParseIssue] = []
    required = [
        "product_name", "product_slug",
        "category", "product_type",
        "description", "seo_title", "seo_description",
    ]
    for key in required:
        if not data.get(key):
            issues.append(ParseIssue("ERROR", f"Missing required field: {key}"))

    cat = data.get("category", "")
    if cat and cat not in ALLOWED_CATEGORIES:
        issues.append(ParseIssue(
            "ERROR",
            f"Category '{cat}' not in allowed taxonomy. "
            f"Valid: {sorted(ALLOWED_CATEGORIES)}",
        ))

    pt = data.get("product_type", "")
    if pt and pt not in ALLOWED_PRODUCT_TYPES:
        issues.append(ParseIssue(
            "ERROR",
            f"Product type '{pt}' not in allowed list. "
            f"Valid: {sorted(ALLOWED_PRODUCT_TYPES)}",
        ))

    seo_title = data.get("seo_title", "")
    if len(seo_title) > 60:
        issues.append(ParseIssue(
            "WARN",
            f"SEO title is {len(seo_title)} chars (recommended <=60)",
        ))

    seo_desc = data.get("seo_description", "")
    if len(seo_desc) > 155:
        issues.append(ParseIssue(
            "WARN",
            f"SEO description is {len(seo_desc)} chars (recommended <=155)",
        ))

    # Banned-term checks run over description + seo fields.
    combined = " ".join([
        data.get("description", ""),
        data.get("seo_title", ""),
        data.get("seo_description", ""),
    ])
    for term, kind in check_banned_terms(combined):
        issues.append(ParseIssue("ERROR", f"Banned {kind}: '{term}'"))
    for term in check_soft_warnings(combined):
        issues.append(ParseIssue("WARN", f"Soft-warning term: '{term}'"))

    # Disclaimer presence check (informational, not blocking).
    if "research use only" not in data.get("description", "").lower():
        issues.append(ParseIssue(
            "WARN",
            "Description is missing the 'For Research Use Only' disclaimer",
        ))

    return issues


def apply_overrides(
    data: dict[str, str],
    overrides: dict[str, dict[str, str]],
) -> list[str]:
    """Apply per-product field overrides in-place, return list of change notes."""
    notes: list[str] = []
    name = data.get("product_name", "")
    if name in overrides:
        for key, new_value in overrides[name].items():
            old = data.get(key, "")
            if old != new_value:
                data[key] = new_value
                notes.append(f"{key}: '{old}' -> '{new_value}'")
    return notes


# ─────────────────────────────────────────────────────────────────────
# CSV row builders
# ─────────────────────────────────────────────────────────────────────

PRODUCTS_CSV_FIELDS = [
    "product_name", "product_slug", "product_type", "category", "description",
    "variant_name", "sku", "price_usd", "cost_price_usd",
    "stock_quantity", "weight_kg",
    "seo_title", "seo_description", "image_filename",
    "collection", "is_published",
]

SEO_CSV_FIELDS = [
    "product_slug",
    "description_p1", "description_p2", "description_p3",
    "purity", "form", "storage",
    "molecular_weight", "cas_number", "sequence",
    "origin", "solubility", "research_category",
    "seo_title", "seo_description",
    "faq_1_q", "faq_1_a",
    "faq_2_q", "faq_2_a",
    "faq_3_q", "faq_3_a",
    "faq_4_q", "faq_4_a",
    "faq_5_q", "faq_5_a",
    "ref_1", "ref_2", "ref_3",
]


def build_product_row(data: dict[str, str]) -> dict[str, str]:
    slug = data.get("product_slug", "unknown")
    # Flatten multi-paragraph description into one string separated by
    # single spaces (matches the existing CSV pattern — import_products.py
    # wraps the whole text in one EditorJS paragraph block).
    desc_flat = " ".join(
        p.strip() for p in data.get("description", "").split("\n") if p.strip()
    )
    return {
        "product_name": data.get("product_name", ""),
        "product_slug": slug,
        "product_type": data.get("product_type", ""),
        "category": data.get("category", ""),
        "description": desc_flat,
        "variant_name": "TBD — edit before import",
        "sku": f"PENDING-{slug.upper()}",
        "price_usd": "0.00",
        "cost_price_usd": "0.00",
        "stock_quantity": "0",
        "weight_kg": "0.05",
        "seo_title": data.get("seo_title", ""),
        "seo_description": data.get("seo_description", ""),
        "image_filename": f"{slug}.jpg",
        "collection": "",  # curated manually via admin
        "is_published": "true",
    }


def build_seo_row(data: dict[str, str]) -> dict[str, str]:
    paragraphs = split_description_paragraphs(data.get("description", ""))
    paragraphs += [""] * (3 - len(paragraphs))  # pad to 3

    row = {
        "product_slug": data.get("product_slug", ""),
        "description_p1": paragraphs[0],
        "description_p2": paragraphs[1],
        "description_p3": paragraphs[2],
        "purity": data.get("purity", ""),
        "form": data.get("form", ""),
        "storage": data.get("storage", ""),
        "molecular_weight": data.get("molecular_weight", ""),
        "cas_number": data.get("cas_number", ""),
        "sequence": data.get("sequence", ""),
        "origin": data.get("origin", ""),
        "solubility": data.get("solubility", ""),
        "research_category": data.get("research_category", ""),
        "seo_title": data.get("seo_title", ""),
        "seo_description": data.get("seo_description", ""),
    }
    for i in range(1, 6):
        row[f"faq_{i}_q"] = data.get(f"faq_{i}_q", "")
        row[f"faq_{i}_a"] = data.get(f"faq_{i}_a", "")
    for i in range(1, 4):
        row[f"ref_{i}"] = data.get(f"ref_{i}", "")
    return row


# ─────────────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────────────


def _status_for(p: ParsedProduct) -> str:
    if p.is_skipped:
        return "SKIP"
    if p.has_errors:
        return "ERROR"
    if p.has_warnings:
        return "WARN"
    return "CLEAN"


STATUS_EMOJI = {
    "CLEAN": ":white_check_mark:",
    "WARN": ":warning:",
    "ERROR": ":x:",
    "SKIP": ":large_blue_circle:",
}


def write_report(path: Path, parsed: list[ParsedProduct]) -> None:
    total = len(parsed)
    by_status: dict[str, int] = {"CLEAN": 0, "WARN": 0, "ERROR": 0, "SKIP": 0}
    for p in parsed:
        by_status[_status_for(p)] += 1

    with open(path, "w", encoding="utf-8") as f:
        f.write("# Perplexity Research — Parse Report\n\n")
        f.write(
            f"**{total} products parsed** — "
            f"{by_status['CLEAN']} clean, "
            f"{by_status['WARN']} warn, "
            f"{by_status['ERROR']} error, "
            f"{by_status['SKIP']} skipped\n\n"
        )
        f.write(
            "Products with **ERROR** status are excluded from the CSVs "
            "and need to be fixed in Perplexity output (or via --overrides) "
            "before re-running.\n\n"
        )
        f.write("---\n\n")
        for p in parsed:
            status = _status_for(p)
            emoji = STATUS_EMOJI[status]
            name = p.data.get("product_name", "(unknown)")
            slug = p.data.get("product_slug", "")
            f.write(f"## {emoji} {status} — {name}")
            if slug:
                f.write(f" (`{slug}`)")
            f.write("\n\n")

            if p.is_skipped:
                f.write(f"Skipped: {p.skip_reason}\n\n---\n\n")
                continue

            f.write(f"- Category: `{p.data.get('category', '')}`\n")
            f.write(f"- Product type: `{p.data.get('product_type', '')}`\n")
            f.write(f"- SEO title: {len(p.data.get('seo_title', ''))} chars\n")
            f.write(
                f"- SEO description: "
                f"{len(p.data.get('seo_description', ''))} chars\n"
            )

            if p.override_notes:
                f.write("\n**Overrides applied:**\n")
                for note in p.override_notes:
                    f.write(f"- {note}\n")

            if p.issues:
                f.write("\n**Issues:**\n")
                for issue in p.issues:
                    f.write(f"- **{issue.level}**: {issue.message}\n")
            else:
                f.write("\nNo issues.\n")
            f.write("\n---\n\n")


# ─────────────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────────────


def process(text: str, overrides: dict[str, dict[str, str]]) -> list[ParsedProduct]:
    parsed: list[ParsedProduct] = []
    for block in extract_blocks(text):
        raw = parse_block(block)
        # Strip [web:N] markers from every text field before validation.
        cleaned = {k: strip_web_markers(v) for k, v in raw.items()}

        product = ParsedProduct(data=cleaned)

        if cleaned.get("status", "").upper() == "INSUFFICIENT_DATA":
            product.is_skipped = True
            product.skip_reason = "Perplexity reported INSUFFICIENT_DATA"
            parsed.append(product)
            continue

        product.override_notes = apply_overrides(cleaned, overrides)
        product.issues = validate(cleaned)
        parsed.append(product)
    return parsed


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument(
        "--input",
        type=Path,
        help="Path to Perplexity output text. If omitted, read from stdin.",
    )
    ap.add_argument(
        "--output-products",
        type=Path,
        default=Path("products_NEW.csv"),
        help="Output CSV matching import_products.py schema.",
    )
    ap.add_argument(
        "--output-seo",
        type=Path,
        default=Path("seo_NEW.csv"),
        help="Output CSV matching import_seo.py schema.",
    )
    ap.add_argument(
        "--report",
        type=Path,
        default=Path("parse_report.md"),
        help="Markdown compliance report.",
    )
    ap.add_argument(
        "--overrides",
        type=Path,
        help=(
            "JSON file mapping product_name -> dict of field overrides. "
            "Example: {\"Cagrilintide\": {\"category\": \"GLP-1 Receptor Agonists\"}}"
        ),
    )
    ap.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress per-product stdout summary.",
    )
    args = ap.parse_args()

    text = (
        args.input.read_text(encoding="utf-8")
        if args.input
        else sys.stdin.read()
    )

    overrides: dict[str, dict[str, str]] = {}
    if args.overrides:
        overrides = json.loads(args.overrides.read_text(encoding="utf-8"))

    parsed = process(text, overrides)

    # Write CSVs (only products that passed validation).
    products_rows: list[dict[str, str]] = []
    seo_rows: list[dict[str, str]] = []
    for p in parsed:
        if p.is_skipped or p.has_errors:
            continue
        products_rows.append(build_product_row(p.data))
        seo_rows.append(build_seo_row(p.data))

    with open(args.output_products, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=PRODUCTS_CSV_FIELDS)
        w.writeheader()
        for row in products_rows:
            w.writerow(row)

    with open(args.output_seo, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SEO_CSV_FIELDS)
        w.writeheader()
        for row in seo_rows:
            w.writerow(row)

    write_report(args.report, parsed)

    # Summary
    if not args.quiet:
        status_counts: dict[str, int] = {
            "CLEAN": 0, "WARN": 0, "ERROR": 0, "SKIP": 0,
        }
        for p in parsed:
            status_counts[_status_for(p)] += 1

        print("=" * 60)
        print(f"Parsed {len(parsed)} product block(s).")
        print(f"  CLEAN: {status_counts['CLEAN']}")
        print(f"  WARN : {status_counts['WARN']}")
        print(f"  ERROR: {status_counts['ERROR']} (skipped from CSV)")
        print(f"  SKIP : {status_counts['SKIP']}")
        print()
        print(f"Wrote:")
        print(f"  - {args.output_products} ({len(products_rows)} rows)")
        print(f"  - {args.output_seo} ({len(seo_rows)} rows)")
        print(f"  - {args.report}")
        if status_counts["ERROR"] > 0:
            print()
            print(
                f"⚠  {status_counts['ERROR']} product(s) failed validation. "
                "See report for details; fix Perplexity output or use "
                "--overrides, then re-run."
            )

    return 0 if all(not p.has_errors for p in parsed if not p.is_skipped) else 1


if __name__ == "__main__":
    sys.exit(main())
