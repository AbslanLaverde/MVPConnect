#!/usr/bin/env python3
"""Smoke test for Crescendo MCP server."""

import sys
import json

sys.path.insert(0, ".")
import crescendo_mcp as srv

def test(name, result_json, checks=None):
    """Run a check and print result."""
    data = json.loads(result_json)
    status = data.get("status", "?")
    ok = True
    if checks:
        for key, expected in checks.items():
            actual = data.get(key)
            if actual != expected:
                ok = False
    
    mark = "✓" if ok else "✗"
    extra = ""
    if status == "ok":
        count = data.get("count", data.get("stats", {}).get("total", "?"))
        extra = f" ({count} results)" if count != "?" else ""
    print(f"  {mark} {name} → {status}{extra}")


print("Crescendo MCP — Smoke Test")
print("=" * 50)

# Test that the module loads and tools are registered
print(f"\nTools registered: {len(srv.mcp._tool_manager._tools)}")
for name, tool in srv.mcp._tool_manager._tools.items():
    print(f"  - {name}")

# Test server_info
print("\n--- server_info ---")
test("server_info", srv.server_info())

# Test db_stats (will be unavailable since Neo4j isn't running)
print("\n--- db_stats (Neo4j unavailable) ---")
test("db_stats", srv.db_stats())

# Test search with no DB
print("\n--- search_musicians (Neo4j unavailable) ---")
test("search_musicians", srv.search_musicians())

# Test login with unreachable backend
print("\n--- login (backend unreachable) ---")
test("login", srv.login("test@test.com", "password"))

# Test find_venue_matches with genre only (no DB)
print("\n--- find_venue_matches_for_musician (genre only, no DB) ---")
test("genre_match", srv.find_venue_matches_for_musician(genre="Jazz", location="New York"))

print("\nDone.")
