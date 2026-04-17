#!/usr/bin/env python3
"""
Saleor Product Import Script for InfinityBio catalog.

Connects to Saleor GraphQL API, clears demo data, creates product types,
categories, collections, and imports all products from CSV.

Usage:
    python3 import_products.py
"""

import csv
import json
import os
import random
import string
import time
import urllib.request
import urllib.error
import ssl

# =============================================================================
# Configuration (override via environment variables for production)
# =============================================================================

SALEOR_URL = os.environ.get("SALEOR_URL", "http://localhost:8000/graphql/")
ADMIN_EMAIL = os.environ.get("SALEOR_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("SALEOR_ADMIN_PASSWORD", "admin")

CHANNEL_SLUG = os.environ.get("SALEOR_CHANNEL_SLUG", "default-channel")
CHANNEL_CURRENCY = os.environ.get("SALEOR_CHANNEL_CURRENCY", "USD")
CHANNEL_COUNTRY = os.environ.get("SALEOR_CHANNEL_COUNTRY", "US")

# These are discovered/created dynamically — no more hardcoded IDs
CHANNEL_ID = None
WAREHOUSE_ID = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.environ.get("CSV_PATH", os.path.join(SCRIPT_DIR, "infinitybio_products_catalog.csv"))

# ─────────────────────────────────────────────────────────────────────
# Product Types — physical/chemical form templates.
# These are DIFFERENT from Categories (mechanism class). A product has one
# product_type (how it's supplied) AND one category (what it is).
# ─────────────────────────────────────────────────────────────────────

PRODUCT_TYPES = [
    "Peptide",
    "Peptide Blend",
    "Hormone",
    "Injectable",
    "Injectable Blend",
    "Supply",
]

# ─────────────────────────────────────────────────────────────────────
# Mechanism Categories (the compliant taxonomy applied by the admin CC
# on 2026-04-17). These replace the previous benefit-labeled Categories.
#
# Each Category describes what the compound IS (chemical class / receptor
# target), not what it's for. See Frier Levitt Peptide Guidance
# Memorandum, April 2026, Section III.B.a.
#
# Do NOT re-introduce generic labels ("Peptides", "Injectables",
# "Hormones", "Growth Hormone") — those were retired as part of the
# compliance pass.
# ─────────────────────────────────────────────────────────────────────

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

# ─────────────────────────────────────────────────────────────────────
# Merchandising Collections — NOT mechanism taxonomy.
#
# Per memo Section III.B.a, Collections carry marketing intent ("what
# it's for") and must remain compliance-neutral. The three supported
# Collections are internal merchandising slots only. Do NOT add
# benefit-labeled Collections (Weight Management, Anti-Aging, etc.) —
# those were deleted as part of the compliance pass and any reference
# here would re-create them.
# ─────────────────────────────────────────────────────────────────────

COLLECTIONS = [
    "Best Sellers",
    "Featured Products",
    "Research Accessories",
]


# =============================================================================
# Helpers
# =============================================================================

def random_block_id(length=10):
    """Generate a random alphanumeric block ID for EditorJS."""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def make_description_json(text):
    """Convert plain text to EditorJS JSON format."""
    if not text or not text.strip():
        return ""
    return json.dumps({
        "time": int(time.time() * 1000),
        "blocks": [
            {
                "id": random_block_id(),
                "data": {"text": text.strip()},
                "type": "paragraph",
            }
        ],
        "version": "2.22.2",
    })


def slugify(name):
    """Simple slugify: lowercase, replace spaces and special chars with hyphens."""
    slug = name.lower()
    result = []
    for ch in slug:
        if ch.isalnum():
            result.append(ch)
        elif ch in (" ", "_", "&"):
            result.append("-")
        # skip other special characters
    slug = "-".join(part for part in "".join(result).split("-") if part)
    return slug


class SaleorClient:
    """Simple GraphQL client for Saleor using only stdlib."""

    def __init__(self, url):
        self.url = url
        self.token = None
        self.token_time = 0
        self.refresh_token = None

    def authenticate(self):
        """Obtain a new auth token."""
        print("\n[AUTH] Authenticating...")
        result = self.execute(
            """
            mutation TokenCreate($email: String!, $password: String!) {
                tokenCreate(email: $email, password: $password) {
                    token
                    refreshToken
                    errors {
                        field
                        message
                    }
                }
            }
            """,
            {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            auth=False,
        )
        data = result.get("tokenCreate", {})
        errors = data.get("errors", [])
        if errors:
            raise Exception(f"Authentication failed: {errors}")
        self.token = data["token"]
        self.refresh_token = data.get("refreshToken")
        self.token_time = time.time()
        print("[AUTH] Authenticated successfully.")

    def ensure_auth(self):
        """Re-authenticate if token is older than 4 minutes."""
        if not self.token or (time.time() - self.token_time) > 240:
            if self.refresh_token:
                # Try to refresh
                result = self.execute(
                    """
                    mutation TokenRefresh($refreshToken: String!) {
                        tokenRefresh(refreshToken: $refreshToken) {
                            token
                            errors {
                                field
                                message
                            }
                        }
                    }
                    """,
                    {"refreshToken": self.refresh_token},
                    auth=False,
                )
                data = result.get("tokenRefresh", {})
                errors = data.get("errors", [])
                if not errors and data.get("token"):
                    self.token = data["token"]
                    self.token_time = time.time()
                    print("[AUTH] Token refreshed.")
                    return
            # Fallback: full re-auth
            self.authenticate()

    def execute(self, query, variables=None, auth=True):
        """Execute a GraphQL query/mutation."""
        if auth:
            self.ensure_auth()

        payload = json.dumps({
            "query": query,
            "variables": variables or {},
        }).encode("utf-8")

        headers = {"Content-Type": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(self.url, data=payload, headers=headers, method="POST")

        try:
            # Allow self-signed certs in dev
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                body = resp.read().decode("utf-8")
                result = json.loads(body)
                if "errors" in result:
                    print(f"  [GQL ERROR] {result['errors']}")
                return result.get("data", {})
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8") if e.fp else ""
            print(f"  [HTTP ERROR] {e.code}: {body[:500]}")
            return {}
        except Exception as e:
            print(f"  [ERROR] {e}")
            return {}


# =============================================================================
# Bootstrap: ensure channel + warehouse exist
# =============================================================================

def ensure_channel(client):
    """Find or create the default channel. Returns (channel_id, channel_slug)."""
    global CHANNEL_ID
    print("\n" + "=" * 60)
    print("BOOTSTRAP: Ensuring channel exists...")
    print("=" * 60)

    # Try to find existing channel by slug
    result = client.execute("""
        query {
            channels {
                id
                slug
                name
                currencyCode
            }
        }
    """)
    channels = result.get("channels", [])

    for ch in channels:
        if ch["slug"] == CHANNEL_SLUG:
            CHANNEL_ID = ch["id"]
            print(f"  Found existing channel '{ch['name']}' (slug: {ch['slug']}) -> {CHANNEL_ID}")
            return CHANNEL_ID

    # Channel doesn't exist — create it
    print(f"  Channel '{CHANNEL_SLUG}' not found. Creating...")
    result = client.execute(
        """
        mutation ChannelCreate($input: ChannelCreateInput!) {
            channelCreate(input: $input) {
                channel {
                    id
                    slug
                    name
                }
                errors {
                    field
                    message
                }
            }
        }
        """,
        {
            "input": {
                "name": "Default Channel",
                "slug": CHANNEL_SLUG,
                "currencyCode": CHANNEL_CURRENCY,
                "defaultCountry": CHANNEL_COUNTRY,
            }
        },
    )
    data = result.get("channelCreate", {})
    errors = data.get("errors", [])
    if errors:
        raise Exception(f"Failed to create channel: {errors}")

    ch = data["channel"]
    CHANNEL_ID = ch["id"]
    print(f"  Created channel '{ch['name']}' (slug: {ch['slug']}) -> {CHANNEL_ID}")
    return CHANNEL_ID


def ensure_warehouse(client):
    """Find or create a warehouse. Returns warehouse_id."""
    global WAREHOUSE_ID
    print("\n" + "=" * 60)
    print("BOOTSTRAP: Ensuring warehouse exists...")
    print("=" * 60)

    # Find existing warehouses
    result = client.execute("""
        query {
            warehouses(first: 10) {
                edges {
                    node {
                        id
                        name
                        slug
                    }
                }
            }
        }
    """)
    edges = result.get("warehouses", {}).get("edges", [])

    if edges:
        wh = edges[0]["node"]
        WAREHOUSE_ID = wh["id"]
        print(f"  Found existing warehouse '{wh['name']}' -> {WAREHOUSE_ID}")
        return WAREHOUSE_ID

    # No warehouse — create one
    print("  No warehouse found. Creating 'Default Warehouse'...")
    result = client.execute(
        """
        mutation WarehouseCreate($input: WarehouseCreateInput!) {
            createWarehouse(input: $input) {
                warehouse {
                    id
                    name
                }
                errors {
                    field
                    message
                }
            }
        }
        """,
        {
            "input": {
                "name": "Default Warehouse",
                "slug": "default-warehouse",
                "shippingZones": [],
                "address": {
                    "companyName": "InfinityBio Labs",
                    "streetAddress1": "123 Research Blvd",
                    "city": "San Diego",
                    "country": CHANNEL_COUNTRY,
                    "postalCode": "92101",
                },
            }
        },
    )
    data = result.get("createWarehouse", {})
    errors = data.get("errors", [])
    if errors:
        raise Exception(f"Failed to create warehouse: {errors}")

    wh = data["warehouse"]
    WAREHOUSE_ID = wh["id"]
    print(f"  Created warehouse '{wh['name']}' -> {WAREHOUSE_ID}")

    # Add the warehouse to the channel
    print(f"  Adding warehouse to channel...")
    client.execute(
        """
        mutation ChannelUpdate($id: ID!, $input: ChannelUpdateInput!) {
            channelUpdate(id: $id, input: $input) {
                channel { id }
                errors { field message }
            }
        }
        """,
        {
            "id": CHANNEL_ID,
            "input": {
                "addWarehouses": [WAREHOUSE_ID],
            },
        },
    )
    print(f"  Warehouse added to channel.")

    return WAREHOUSE_ID


# =============================================================================
# Delete operations
# =============================================================================

def delete_all_products(client):
    """Delete all existing products."""
    print("\n" + "=" * 60)
    print("STEP 1: Deleting all existing products...")
    print("=" * 60)

    # Query all product IDs
    has_next = True
    cursor = None
    all_ids = []

    while has_next:
        after_clause = f', after: "{cursor}"' if cursor else ""
        result = client.execute(f"""
            query {{
                products(first: 100{after_clause}) {{
                    edges {{
                        node {{
                            id
                            name
                        }}
                        cursor
                    }}
                    pageInfo {{
                        hasNextPage
                    }}
                }}
            }}
        """)
        products = result.get("products", {})
        edges = products.get("edges", [])
        for edge in edges:
            all_ids.append((edge["node"]["id"], edge["node"]["name"]))
            cursor = edge["cursor"]
        has_next = products.get("pageInfo", {}).get("hasNextPage", False)

    print(f"  Found {len(all_ids)} products to delete.")

    for i, (pid, pname) in enumerate(all_ids, 1):
        result = client.execute(
            """
            mutation ProductDelete($id: ID!) {
                productDelete(id: $id) {
                    errors {
                        field
                        message
                    }
                }
            }
            """,
            {"id": pid},
        )
        errors = result.get("productDelete", {}).get("errors", [])
        if errors:
            print(f"  [{i}/{len(all_ids)}] FAILED to delete '{pname}': {errors}")
        else:
            print(f"  [{i}/{len(all_ids)}] Deleted '{pname}'")

    print(f"  Done. Deleted {len(all_ids)} products.")




# =============================================================================
# Create operations
# =============================================================================

def _fetch_all_product_types(client):
    """Page through all existing product types. Returns dict: slug -> (id, name)."""
    existing = {}
    has_next = True
    cursor = None
    while has_next:
        after_clause = f', after: "{cursor}"' if cursor else ""
        result = client.execute(f"""
            query {{
                productTypes(first: 100{after_clause}) {{
                    edges {{
                        node {{ id name slug }}
                        cursor
                    }}
                    pageInfo {{ hasNextPage }}
                }}
            }}
        """)
        pt = result.get("productTypes", {})
        edges = pt.get("edges", [])
        for edge in edges:
            node = edge["node"]
            slug = node.get("slug") or slugify(node["name"])
            existing[slug] = (node["id"], node["name"])
            cursor = edge["cursor"]
        has_next = pt.get("pageInfo", {}).get("hasNextPage", False)
    return existing


def ensure_product_types(client):
    """Ensure each product type exists. Returns dict: name -> ID.

    Idempotent — does NOT delete anything. Queries existing product types,
    uses them if present, creates only what's missing. Safe to re-run.
    """
    print("\n" + "=" * 60)
    print("STEP 5: Ensuring product types exist (idempotent)...")
    print("=" * 60)

    existing = _fetch_all_product_types(client)
    pt_map = {}
    created_count = 0
    reused_count = 0

    for pt_name in PRODUCT_TYPES:
        slug = slugify(pt_name)
        if slug in existing:
            pt_id, actual_name = existing[slug]
            pt_map[pt_name] = pt_id
            reused_count += 1
            print(f"  [EXISTS] '{pt_name}' -> {pt_id}")
            continue

        result = client.execute(
            """
            mutation ProductTypeCreate($input: ProductTypeInput!) {
                productTypeCreate(input: $input) {
                    productType { id name }
                    errors { field message }
                }
            }
            """,
            {
                "input": {
                    "name": pt_name,
                    "slug": slug,
                    "isShippingRequired": True,
                    "isDigital": False,
                    "productAttributes": [],
                    "variantAttributes": [],
                }
            },
        )
        data = result.get("productTypeCreate", {})
        errors = data.get("errors", [])
        if errors:
            print(f"  [FAIL] '{pt_name}': {errors}")
        else:
            pt = data.get("productType", {})
            pt_map[pt_name] = pt["id"]
            created_count += 1
            print(f"  [CREATED] '{pt_name}' -> {pt['id']}")

    print(f"  Summary: {reused_count} existed, {created_count} created.")
    return pt_map


def _fetch_all_categories(client):
    """Page through all existing categories. Returns dict: slug -> (id, name)."""
    existing = {}
    has_next = True
    cursor = None
    while has_next:
        after_clause = f', after: "{cursor}"' if cursor else ""
        result = client.execute(f"""
            query {{
                categories(first: 100{after_clause}) {{
                    edges {{
                        node {{ id name slug }}
                        cursor
                    }}
                    pageInfo {{ hasNextPage }}
                }}
            }}
        """)
        cats = result.get("categories", {})
        edges = cats.get("edges", [])
        for edge in edges:
            node = edge["node"]
            slug = node.get("slug") or slugify(node["name"])
            existing[slug] = (node["id"], node["name"])
            cursor = edge["cursor"]
        has_next = cats.get("pageInfo", {}).get("hasNextPage", False)
    return existing


def ensure_categories(client):
    """Ensure each category exists. Returns dict: name -> ID.

    Idempotent — does NOT delete anything. Queries existing categories,
    uses them if present, creates only what's missing. Safe to re-run.
    """
    print("\n" + "=" * 60)
    print("STEP 6: Ensuring categories exist (idempotent)...")
    print("=" * 60)

    existing = _fetch_all_categories(client)
    cat_map = {}
    created_count = 0
    reused_count = 0

    for cat_name in CATEGORIES:
        slug = slugify(cat_name)
        if slug in existing:
            cat_id, _ = existing[slug]
            cat_map[cat_name] = cat_id
            reused_count += 1
            print(f"  [EXISTS] '{cat_name}' -> {cat_id}")
            continue

        result = client.execute(
            """
            mutation CategoryCreate($input: CategoryInput!) {
                categoryCreate(input: $input) {
                    category { id name }
                    errors { field message }
                }
            }
            """,
            {"input": {"name": cat_name, "slug": slug}},
        )
        data = result.get("categoryCreate", {})
        errors = data.get("errors", [])
        if errors:
            print(f"  [FAIL] '{cat_name}': {errors}")
        else:
            cat = data.get("category", {})
            cat_map[cat_name] = cat["id"]
            created_count += 1
            print(f"  [CREATED] '{cat_name}' -> {cat['id']}")

    print(f"  Summary: {reused_count} existed, {created_count} created.")
    return cat_map


def _fetch_all_collections(client):
    """Page through all existing collections in the channel. Returns dict: slug -> (id, name)."""
    existing = {}
    has_next = True
    cursor = None
    while has_next:
        after_clause = f', after: "{cursor}"' if cursor else ""
        result = client.execute(f"""
            query {{
                collections(first: 100{after_clause}, channel: "{CHANNEL_SLUG}") {{
                    edges {{
                        node {{ id name slug }}
                        cursor
                    }}
                    pageInfo {{ hasNextPage }}
                }}
            }}
        """)
        cols = result.get("collections", {})
        edges = cols.get("edges", [])
        for edge in edges:
            node = edge["node"]
            slug = node.get("slug") or slugify(node["name"])
            existing[slug] = (node["id"], node["name"])
            cursor = edge["cursor"]
        has_next = cols.get("pageInfo", {}).get("hasNextPage", False)
    return existing


def _publish_collection_in_channel(client, col_id, col_name):
    """Ensure a collection is published in CHANNEL_SLUG. No-op if already published."""
    result2 = client.execute(
        """
        mutation CollectionChannelListingUpdate($id: ID!, $input: CollectionChannelListingUpdateInput!) {
            collectionChannelListingUpdate(id: $id, input: $input) {
                collection { id }
                errors { field message }
            }
        }
        """,
        {
            "id": col_id,
            "input": {
                "addChannels": [{"channelId": CHANNEL_ID, "isPublished": True}],
            },
        },
    )
    errors2 = result2.get("collectionChannelListingUpdate", {}).get("errors", [])
    if errors2:
        # Duplicate-channel errors are harmless — already published
        non_dup_errors = [e for e in errors2 if "already" not in (e.get("message") or "").lower()]
        if non_dup_errors:
            print(f"    [WARN] Failed to publish '{col_name}' in channel: {errors2}")


def ensure_collections(client):
    """Ensure each merchandising collection exists. Returns dict: name -> ID.

    Idempotent — does NOT delete anything. Queries existing collections by
    slug, reuses if present, creates only what's missing. Safe to re-run.

    Note: this function should NEVER re-create benefit-labeled collections
    that the admin CC explicitly deleted. The COLLECTIONS constant at the
    top of this file is the single source of truth for supported slugs.
    """
    print("\n" + "=" * 60)
    print("STEP 7: Ensuring collections exist (idempotent)...")
    print("=" * 60)

    existing = _fetch_all_collections(client)
    col_map = {}
    created_count = 0
    reused_count = 0

    for col_name in COLLECTIONS:
        slug = slugify(col_name)
        if slug in existing:
            col_id, _ = existing[slug]
            col_map[col_name] = col_id
            reused_count += 1
            print(f"  [EXISTS] '{col_name}' -> {col_id}")
            # Ensure channel publication even for existing collections
            _publish_collection_in_channel(client, col_id, col_name)
            continue

        result = client.execute(
            """
            mutation CollectionCreate($input: CollectionCreateInput!) {
                collectionCreate(input: $input) {
                    collection { id name }
                    errors { field message }
                }
            }
            """,
            {"input": {"name": col_name, "slug": slug}},
        )
        data = result.get("collectionCreate", {})
        errors = data.get("errors", [])
        if errors:
            print(f"  [FAIL] '{col_name}': {errors}")
            continue

        col = data.get("collection", {})
        col_id = col["id"]
        col_map[col_name] = col_id
        created_count += 1
        print(f"  [CREATED] '{col_name}' -> {col_id}")
        _publish_collection_in_channel(client, col_id, col_name)
        print(f"    Published in {CHANNEL_SLUG}")

    print(f"  Summary: {reused_count} existed, {created_count} created.")
    return col_map


# =============================================================================
# Product import
# =============================================================================

def read_csv_products():
    """Read CSV and group rows by product_name. Returns ordered list of product dicts."""
    products = {}
    product_order = []

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["product_name"]
            if name not in products:
                products[name] = {
                    "product_name": row["product_name"],
                    "product_slug": row["product_slug"],
                    "product_type": row["product_type"],
                    "category": row["category"],
                    "description": row["description"],
                    "seo_title": row.get("seo_title", ""),
                    "seo_description": row.get("seo_description", ""),
                    "collection": row["collection"],
                    "is_published": row.get("is_published", "true").lower() == "true",
                    "variants": [],
                }
                product_order.append(name)

            products[name]["variants"].append({
                "variant_name": row["variant_name"],
                "sku": row["sku"],
                "price_usd": row["price_usd"],
                "cost_price_usd": row["cost_price_usd"],
                "stock_quantity": int(row.get("stock_quantity", 0)),
                "weight_kg": row.get("weight_kg", ""),
            })

    return [products[name] for name in product_order]


def create_product(client, product_data, pt_map, cat_map, col_map):
    """Create a single product with its variants and collection assignment."""
    name = product_data["product_name"]
    slug = product_data["product_slug"]
    description_json = make_description_json(product_data["description"])

    # Look up IDs
    pt_id = pt_map.get(product_data["product_type"])
    cat_id = cat_map.get(product_data["category"])
    col_id = col_map.get(product_data["collection"])

    if not pt_id:
        print(f"    WARNING: Product type '{product_data['product_type']}' not found, skipping '{name}'")
        return False
    if not cat_id:
        print(f"    WARNING: Category '{product_data['category']}' not found, skipping '{name}'")
        return False

    # Build input (channelListings is NOT part of ProductCreateInput)
    product_input = {
        "name": name,
        "slug": slug,
        "productType": pt_id,
        "category": cat_id,
    }
    if description_json:
        product_input["description"] = description_json

    # Add SEO if present
    seo_title = product_data.get("seo_title", "").strip()
    seo_desc = product_data.get("seo_description", "").strip()
    if seo_title or seo_desc:
        product_input["seo"] = {}
        if seo_title:
            product_input["seo"]["title"] = seo_title
        if seo_desc:
            product_input["seo"]["description"] = seo_desc

    # Create product
    result = client.execute(
        """
        mutation ProductCreate($input: ProductCreateInput!) {
            productCreate(input: $input) {
                product {
                    id
                    name
                }
                errors {
                    field
                    message
                }
            }
        }
        """,
        {"input": product_input},
    )

    data = result.get("productCreate", {})
    errors = data.get("errors", [])
    if errors:
        print(f"    FAILED to create product '{name}': {errors}")
        return False

    product = data.get("product")
    if not product or "id" not in product:
        print(f"    FAILED to create product '{name}': no product returned")
        return False
    product_id = product["id"]

    # Set channel listing separately
    client.execute(
        """
        mutation ProductChannelListingUpdate($id: ID!, $input: ProductChannelListingUpdateInput!) {
            productChannelListingUpdate(id: $id, input: $input) {
                errors {
                    field
                    message
                    channels
                }
            }
        }
        """,
        {
            "id": product_id,
            "input": {
                "updateChannels": [
                    {
                        "channelId": CHANNEL_ID,
                        "isPublished": product_data["is_published"],
                        "isAvailableForPurchase": True,
                        "visibleInListings": True,
                    }
                ],
            },
        },
    )

    # Create variants via bulk
    variant_inputs = []
    for v in product_data["variants"]:
        vi = {
            "name": v["variant_name"],
            "sku": v["sku"],
            "attributes": [],
            "channelListings": [
                {
                    "channelId": CHANNEL_ID,
                    "price": v["price_usd"],
                    **({"costPrice": v["cost_price_usd"]} if v.get("cost_price_usd") else {}),
                }
            ],
            "stocks": [
                {
                    "warehouse": WAREHOUSE_ID,
                    "quantity": v["stock_quantity"],
                }
            ],
        }
        if v.get("weight_kg"):
            try:
                vi["weight"] = float(v["weight_kg"])
            except (ValueError, TypeError):
                pass
        variant_inputs.append(vi)

    result2 = client.execute(
        """
        mutation ProductVariantBulkCreate($id: ID!, $inputs: [ProductVariantBulkCreateInput!]!) {
            productVariantBulkCreate(product: $id, variants: $inputs) {
                productVariants {
                    id
                    name
                    sku
                }
                errors {
                    field
                    message
                    index
                }
            }
        }
        """,
        {"id": product_id, "inputs": variant_inputs},
    )

    data2 = result2.get("productVariantBulkCreate", {})
    errors2 = data2.get("errors", [])
    created_variants = data2.get("productVariants", [])
    if errors2:
        print(f"    WARNING: Variant errors for '{name}': {errors2}")
    variant_count = len(created_variants) if created_variants else 0

    # Add to collection
    if col_id:
        result3 = client.execute(
            """
            mutation CollectionAddProducts($id: ID!, $products: [ID!]!) {
                collectionAddProducts(collectionId: $id, products: $products) {
                    errors {
                        field
                        message
                    }
                }
            }
            """,
            {"id": col_id, "products": [product_id]},
        )
        errors3 = result3.get("collectionAddProducts", {}).get("errors", [])
        if errors3:
            print(f"    WARNING: Failed to add '{name}' to collection: {errors3}")

    return True


def import_products(client, pt_map, cat_map, col_map):
    """Read CSV and create all products."""
    print("\n" + "=" * 60)
    print("STEP 8: Importing products from CSV...")
    print("=" * 60)

    products = read_csv_products()
    total = len(products)
    success = 0
    failed = 0

    for i, product_data in enumerate(products, 1):
        # Re-auth every 10 products to be safe
        if i % 10 == 1:
            client.ensure_auth()

        name = product_data["product_name"]
        variant_count = len(product_data["variants"])
        collection = product_data["collection"]
        print(f"\n  [{i}/{total}] Creating '{name}' ({variant_count} variants, collection: '{collection}')...")

        ok = create_product(client, product_data, pt_map, cat_map, col_map)
        if ok:
            success += 1
            print(f"    OK")
        else:
            failed += 1

    return success, failed


# =============================================================================
# Main
# =============================================================================

def _confirm_destructive_op(env_var, prompt_msg):
    """Interactive y/N confirmation before a destructive operation.

    Bypass with env var (e.g. `CONFIRM_DELETE_PRODUCTS=yes`) for CI / batch runs.
    """
    if os.environ.get(env_var, "").strip().lower() in ("yes", "y", "1", "true"):
        print(f"  [auto-confirmed via {env_var}]")
        return True

    try:
        answer = input(f"\n{prompt_msg} [y/N]: ").strip().lower()
    except EOFError:
        answer = ""
    return answer in ("y", "yes")


def main():
    print("=" * 60)
    print("InfinityBio Saleor Product Import Script (non-destructive taxonomy)")
    print("=" * 60)
    print(f"API:       {SALEOR_URL}")
    print(f"Admin:     {ADMIN_EMAIL}")
    print(f"Channel:   {CHANNEL_SLUG}")
    print(f"CSV:       {CSV_PATH}")
    print()
    print("  Product types, categories, collections: ENSURE-EXISTS (preserved)")
    print("  Products:                               DESTRUCTIVE (all replaced)")

    client = SaleorClient(SALEOR_URL)
    client.authenticate()

    # Phase 0: Bootstrap — ensure channel + warehouse exist
    ensure_channel(client)
    ensure_warehouse(client)

    # Phase 1: Ensure taxonomy exists BEFORE any destructive operation.
    # This guarantees the mechanism taxonomy is in place even if this is
    # the first run against a fresh Saleor.
    pt_map = ensure_product_types(client)
    cat_map = ensure_categories(client)
    col_map = ensure_collections(client)

    print("\n--- Taxonomy ready ---")
    print(f"  Product Types: {len(pt_map)}")
    print(f"  Categories:    {len(cat_map)}")
    print(f"  Collections:   {len(col_map)}")

    # Phase 2: Destructive — delete existing products.
    # Taxonomy is NOT touched; only product rows are wiped so the CSV can
    # reseed them cleanly. Use env CONFIRM_DELETE_PRODUCTS=yes to bypass
    # the interactive confirmation (e.g. from CI).
    if not _confirm_destructive_op(
        "CONFIRM_DELETE_PRODUCTS",
        "About to DELETE ALL PRODUCTS on this Saleor instance. "
        "Taxonomy will be preserved. Continue?",
    ):
        print("Aborted by user. No changes made.")
        return

    delete_all_products(client)

    # Phase 3: Import products from CSV
    success, failed = import_products(client, pt_map, cat_map, col_map)

    # Summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"  Product Types: {len(pt_map)} (preserved/ensured)")
    print(f"  Categories:    {len(cat_map)} (preserved/ensured)")
    print(f"  Collections:   {len(col_map)} (preserved/ensured)")
    print(f"  Products:      {success} created, {failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
