"""Generate TypeScript types from Supabase `public` schema via information_schema.

Shape compatible with `@supabase/supabase-js` `Database` generic (subset):
  Database['public']['Tables'][T]['Row' | 'Insert' | 'Update']
  Database['public']['Enums'][E]

Only covers what P3-01 requires: tables (Row/Insert/Update), enums.
Views/Functions/CompositeTypes are emitted as empty objects.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
OUT_PATH = ROOT / "karaoke-app" / "types" / "database.ts"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


# PostgreSQL (information_schema `data_type`) → TypeScript
PG_TO_TS: dict[str, str] = {
    "uuid": "string",
    "text": "string",
    "character varying": "string",
    "varchar": "string",
    "character": "string",
    "citext": "string",
    "integer": "number",
    "smallint": "number",
    "bigint": "number",
    "numeric": "number",
    "real": "number",
    "double precision": "number",
    "boolean": "boolean",
    "timestamp with time zone": "string",
    "timestamp without time zone": "string",
    "date": "string",
    "time with time zone": "string",
    "time without time zone": "string",
    "interval": "string",
    "jsonb": "Json",
    "json": "Json",
    "bytea": "string",
    "inet": "string",
    "cidr": "string",
    "macaddr": "string",
}


@dataclass(frozen=True)
class Column:
    name: str
    data_type: str
    udt_name: str
    is_nullable: bool
    has_default: bool
    is_identity: bool
    is_generated: bool
    element_type: str | None  # For ARRAY types
    element_udt: str | None


@dataclass(frozen=True)
class Table:
    name: str
    columns: tuple[Column, ...]


def fetch_functions(cur, enums: dict[str, list[str]]) -> list[dict]:
    """Return public functions that should be exposed in Database['Functions'].

    We surface user-authored routines in schema `public` that have a plpgsql
    or sql body. Built-in extension helpers are skipped. Each row carries:
      name, args: [(name, ts_type)], returns: ts_type, returns_setof: bool
    """
    cur.execute(
        """
        SELECT
          p.proname,
          pg_get_function_identity_arguments(p.oid) AS args_sig,
          pg_get_function_result(p.oid) AS returns_sig,
          p.proretset
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = 'public'
          AND l.lanname IN ('plpgsql','sql')
          AND p.prokind = 'f'
          -- Skip trigger functions (they take no args relevant to RPC)
          AND pg_get_function_result(p.oid) NOT IN ('trigger')
        ORDER BY p.proname
        """
    )
    rows = cur.fetchall()
    out: list[dict] = []
    for name, args_sig, returns_sig, retset in rows:
        args: list[tuple[str, str]] = []
        if args_sig:
            for part in args_sig.split(","):
                part = part.strip()
                if not part:
                    continue
                # "p_card_no text" or "p_user_id uuid"
                pieces = part.rsplit(" ", 1)
                if len(pieces) != 2:
                    continue
                arg_name, arg_type = pieces
                arg_name = arg_name.strip()
                arg_type = arg_type.strip()
                args.append((arg_name, _pg_sig_to_ts(arg_type, enums)))
        returns_ts = _pg_sig_to_ts(returns_sig or "void", enums)
        out.append(
            {
                "name": name,
                "args": args,
                "returns": returns_ts,
                "returns_setof": bool(retset),
            }
        )
    return out


def _pg_sig_to_ts(sig: str, enums: dict[str, list[str]]) -> str:
    """Map a pg_get_function_* signature fragment (e.g. 'text', 'uuid',
    'integer[]', 'SETOF record') to a TypeScript type."""
    s = sig.strip().lower()
    if s.startswith("setof "):
        s = s[len("setof "):]
    # Strip trailing length/precision qualifiers
    if "(" in s:
        s = s.split("(", 1)[0].strip()
    is_array = s.endswith("[]")
    if is_array:
        s = s[:-2]
    base_map = {
        "text": "string",
        "varchar": "string",
        "character varying": "string",
        "character": "string",
        "uuid": "string",
        "citext": "string",
        "bytea": "string",
        "inet": "string",
        "cidr": "string",
        "macaddr": "string",
        "date": "string",
        "timestamp": "string",
        "timestamp with time zone": "string",
        "timestamp without time zone": "string",
        "time": "string",
        "time with time zone": "string",
        "time without time zone": "string",
        "interval": "string",
        "boolean": "boolean",
        "bool": "boolean",
        "smallint": "number",
        "integer": "number",
        "bigint": "number",
        "numeric": "number",
        "real": "number",
        "double precision": "number",
        "json": "Json",
        "jsonb": "Json",
        "void": "undefined",
    }
    base = base_map.get(s)
    if base is None:
        if s in enums:
            base = f'Database["public"]["Enums"]["{s}"]'
        else:
            base = f"unknown /* {sig} */"
    return f"{base}[]" if is_array else base


def fetch_enums(cur) -> dict[str, list[str]]:
    cur.execute(
        """
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder
        """
    )
    out: dict[str, list[str]] = {}
    for typname, label in cur.fetchall():
        out.setdefault(typname, []).append(label)
    return out


def fetch_tables(cur, enums: dict[str, list[str]]) -> list[Table]:
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
        """
    )
    table_names = [r[0] for r in cur.fetchall()]

    tables: list[Table] = []
    for tname in table_names:
        cur.execute(
            """
            SELECT
              column_name,
              data_type,
              udt_name,
              is_nullable,
              column_default,
              is_identity,
              is_generated
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (tname,),
        )
        cols: list[Column] = []
        for row in cur.fetchall():
            name, data_type, udt_name, is_nullable, col_default, is_identity, is_generated = row
            element_type: str | None = None
            element_udt: str | None = None
            if data_type == "ARRAY":
                # udt_name like "_int4"; element type via information_schema.element_types
                cur.execute(
                    """
                    SELECT data_type, udt_name
                    FROM information_schema.element_types
                    WHERE object_schema = 'public'
                      AND object_name = %s
                      AND collection_type_identifier = (
                        SELECT dtd_identifier FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
                      )
                    """,
                    (tname, tname, name),
                )
                r2 = cur.fetchone()
                if r2:
                    element_type, element_udt = r2
            cols.append(
                Column(
                    name=name,
                    data_type=data_type,
                    udt_name=udt_name,
                    is_nullable=(is_nullable == "YES"),
                    has_default=col_default is not None,
                    is_identity=(is_identity == "YES"),
                    is_generated=(is_generated and is_generated != "NEVER"),
                    element_type=element_type,
                    element_udt=element_udt,
                )
            )
        tables.append(Table(name=tname, columns=tuple(cols)))
    return tables


def ts_type_for(
    data_type: str,
    udt_name: str,
    element_type: str | None,
    element_udt: str | None,
    enums: dict[str, list[str]],
) -> str:
    if data_type == "USER-DEFINED" and udt_name in enums:
        return f'Database["public"]["Enums"]["{udt_name}"]'
    if data_type == "ARRAY":
        inner = ts_type_for(element_type or "", element_udt or "", None, None, enums)
        return f"{inner}[]"
    base = PG_TO_TS.get(data_type)
    if base is not None:
        return base
    # Fallback — surface unknown types loudly so we can extend the mapping.
    return f'unknown /* {data_type} ({udt_name}) */'


def emit_column(col: Column, kind: str, enums: dict[str, list[str]]) -> str:
    """kind: 'Row' | 'Insert' | 'Update'"""
    ts = ts_type_for(col.data_type, col.udt_name, col.element_type, col.element_udt, enums)
    if kind == "Row":
        ts_final = f"{ts} | null" if col.is_nullable else ts
        return f"          {col.name}: {ts_final}"
    if kind == "Insert":
        # Optional if nullable, has default, identity, or generated.
        optional = col.is_nullable or col.has_default or col.is_identity or col.is_generated
        ts_final = f"{ts} | null" if col.is_nullable else ts
        return f"          {col.name}{'?' if optional else ''}: {ts_final}"
    # Update: everything optional
    ts_final = f"{ts} | null" if col.is_nullable else ts
    return f"          {col.name}?: {ts_final}"


def render(tables: list[Table], enums: dict[str, list[str]], funcs: list[dict]) -> str:
    lines: list[str] = []
    lines.append("// Auto-generated by scripts/gen_supabase_types.py — do not edit by hand.")
    lines.append("// Regenerate with: python scripts/gen_supabase_types.py")
    lines.append("")
    lines.append("export type Json =")
    lines.append("  | string")
    lines.append("  | number")
    lines.append("  | boolean")
    lines.append("  | null")
    lines.append("  | { [key: string]: Json | undefined }")
    lines.append("  | Json[];")
    lines.append("")
    lines.append("export type Database = {")
    lines.append("  public: {")

    # Tables
    lines.append("    Tables: {")
    for t in tables:
        lines.append(f"      {t.name}: {{")
        for kind in ("Row", "Insert", "Update"):
            lines.append(f"        {kind}: {{")
            for col in t.columns:
                lines.append(emit_column(col, kind, enums))
            lines.append("        };")
        # postgrest-js v12 requires Relationships; we emit empty for now.
        lines.append("        Relationships: [];")
        lines.append("      };")
    lines.append("    };")

    lines.append("    Views: { [_ in never]: never };")

    # Functions
    if funcs:
        lines.append("    Functions: {")
        for fn in funcs:
            lines.append(f"      {fn['name']}: {{")
            if fn["args"]:
                lines.append("        Args: {")
                for aname, ats in fn["args"]:
                    lines.append(f"          {aname}: {ats};")
                lines.append("        };")
            else:
                lines.append("        Args: Record<PropertyKey, never>;")
            returns_ts = fn["returns"]
            if fn["returns_setof"]:
                returns_ts = f"{returns_ts}[]"
            lines.append(f"        Returns: {returns_ts};")
            lines.append("      };")
        lines.append("    };")
    else:
        lines.append("    Functions: { [_ in never]: never };")
    lines.append("    CompositeTypes: { [_ in never]: never };")

    # Enums
    lines.append("    Enums: {")
    for ename, labels in sorted(enums.items()):
        union = " | ".join(f'"{label}"' for label in labels)
        lines.append(f"      {ename}: {union};")
    lines.append("    };")

    lines.append("  };")
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    env = load_env()
    db_url = env.get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL missing", file=sys.stderr)
        return 2
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            enums = fetch_enums(cur)
            tables = fetch_tables(cur, enums)
            funcs = fetch_functions(cur, enums)
    finally:
        conn.close()
    content = render(tables, enums, funcs)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(content, encoding="utf-8")
    print(
        f"Wrote {OUT_PATH} ({len(tables)} tables, {len(enums)} enums, {len(funcs)} functions)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
