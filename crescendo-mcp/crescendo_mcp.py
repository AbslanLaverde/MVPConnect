#!/usr/bin/env python3
"""
Crescendo / MVPConnect MCP Server

Exposes the Crescendo music marketplace as AI-native tools.
Connects to the Spring Boot REST API for auth and Neo4j directly for graph queries.

Run:  /usr/local/bin/python3.11 crescendo_mcp.py
"""

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import requests
from mcp.server.fastmcp import FastMCP

# ── Configuration ─────────────────────────────────────────────────────

API_BASE = os.environ.get("CRESCENDO_API_URL", "http://localhost:8081")
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASS = os.environ.get("NEO4J_PASS", "changeme")

# ── State ─────────────────────────────────────────────────────────────

_driver = None  # Neo4j driver (lazy init)
_auth_token: Optional[str] = None


def _get_driver():
    """Lazy-initialize the Neo4j driver."""
    global _driver
    if _driver is None:
        try:
            from neo4j import GraphDatabase
            _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
            # Test connection
            _driver.verify_connectivity()
        except Exception as e:
            return None
    return _driver


def _db_available() -> bool:
    return _get_driver() is not None


# ── MCP Server ───────────────────────────────────────────────────────

mcp = FastMCP(
    name="Crescendo",
    instructions=(
        "Crescendo is a music industry marketplace connecting musicians, "
        "venues, and promoters. Use these tools to search for artists, find "
        "venues that book specific genres, discover promoters with relevant "
        "specialties, and explore match recommendations. Start with the "
        "server_info tool to check if the database is connected."
    ),
)


# ═══════════════════════════════════════════════════════════════════════
# Informational Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def server_info() -> str:
    """
    Check server status and database connectivity.
    Returns whether Neo4j, the backend API, and auth are available.
    """
    db = _get_driver()
    db_status = "connected" if db else "unavailable"

    api_status = "unreachable"
    api_version = ""
    try:
        r = requests.get(f"{API_BASE}/actuator/health", timeout=3)
        if r.status_code == 200:
            api_status = "ok"
            api_version = r.json().get("status", "")
        else:
            api_status = f"error (HTTP {r.status_code})"
    except requests.ConnectionError:
        api_status = "unreachable"

    return json.dumps({
        "status": "ok",
        "server": "Crescendo MCP",
        "neo4j": db_status,
        "backend_api": api_status,
        "backend_url": API_BASE,
        "authenticated": _auth_token is not None,
    })


# ═══════════════════════════════════════════════════════════════════════
# Auth Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def login(email: str, password: str) -> str:
    """
    Authenticate against the Crescendo backend.
    Required before some mutation operations.
    
    Args:
        email: User's email address
        password: User's password
    
    Returns:
        JWT token and user info (userType, userId, displayName)
    """
    global _auth_token
    try:
        r = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        if r.status_code == 200:
            data = r.json()
            _auth_token = data.get("token", "")
            return json.dumps({
                "status": "ok",
                "token": data.get("token", "")[:20] + "...",
                "userType": data.get("userType"),
                "userId": data.get("userId"),
                "displayName": data.get("displayName"),
            })
        else:
            return json.dumps({
                "status": "error",
                "error": f"Login failed: HTTP {r.status_code}",
            })
    except requests.ConnectionError:
        return json.dumps({
            "status": "error",
            "error": f"Cannot connect to backend at {API_BASE}",
        })
    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════════════════
# Musician Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def search_musicians(
    genre: str = "",
    location: str = "",
    max_fee: str = "",
    willing_to_travel: bool = False,
    limit: int = 20,
) -> str:
    """
    Search for musicians/bands in the database.

    Args:
        genre: Filter by genre (e.g. "Jazz", "Rock", "Blues", "Electronic")
        location: Filter by location (e.g. "New York, NY", "Brooklyn")
        max_fee: Maximum minimum fee (e.g. "$500", "$1000")
        willing_to_travel: Only show musicians willing to travel
        limit: Max results to return (default 20)

    Returns:
        List of matching musicians with name, genres, location, fee, etc.
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected. Start the backend to query data.",
            })

        where_clauses = []
        params = {}

        if genre:
            where_clauses.append("any(g IN m.genres WHERE toLower(g) CONTAINS toLower($genre))")
            params["genre"] = genre

        if location:
            where_clauses.append("toLower(m.location) CONTAINS toLower($location)")
            params["location"] = location

        if willing_to_travel:
            where_clauses.append("m.willingToTravel = true")

        where_str = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
            MATCH (m:Musician)
            WHERE {where_str}
            RETURN m.id AS id, m.name AS name, m.email AS email,
                   m.bio AS bio, m.location AS location,
                   m.genres AS genres, m.vibes AS vibes,
                   m.minimumFee AS minimumFee,
                   m.willingToTravel AS willingToTravel,
                   m.websiteUrl AS websiteUrl,
                   m.instagramHandle AS instagramHandle
            ORDER BY m.name
            LIMIT $limit
        """
        params["limit"] = limit

        results = []
        with db.session() as session:
            for record in session.run(query, params):
                results.append({
                    "id": record.get("id"),
                    "name": record.get("name"),
                    "location": record.get("location") or "",
                    "genres": record.get("genres") or [],
                    "vibes": record.get("vibes") or [],
                    "minimumFee": record.get("minimumFee") or "",
                    "willingToTravel": record.get("willingToTravel") or False,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "instagramHandle": record.get("instagramHandle") or "",
                    "bio": (record.get("bio") or "")[:200],
                })

        return json.dumps({
            "status": "ok",
            "count": len(results),
            "musicians": results,
        })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


@mcp.tool()
def get_musician(musician_id: str) -> str:
    """
    Get full details for a specific musician by ID.

    Args:
        musician_id: The musician's UUID

    Returns:
        Full musician profile
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        with db.session() as session:
            result = session.run(
                """
                MATCH (m:Musician {id: $id})
                RETURN m.id AS id, m.name AS name, m.email AS email,
                       m.bio AS bio, m.location AS location,
                       m.profileImageUrl AS profileImageUrl,
                       m.genres AS genres, m.vibes AS vibes,
                       m.minimumFee AS minimumFee,
                       m.willingToTravel AS willingToTravel,
                       m.websiteUrl AS websiteUrl,
                       m.instagramHandle AS instagramHandle,
                       m.createdAt AS createdAt
                """,
                id=musician_id,
            )
            record = result.single()
            if not record:
                return json.dumps({
                    "status": "not_found",
                    "message": f"No musician found with id: {musician_id}",
                })

            return json.dumps({
                "status": "ok",
                "musician": {
                    "id": record.get("id"),
                    "name": record.get("name"),
                    "email": record.get("email"),
                    "bio": record.get("bio") or "",
                    "location": record.get("location") or "",
                    "profileImageUrl": record.get("profileImageUrl") or "",
                    "genres": record.get("genres") or [],
                    "vibes": record.get("vibes") or [],
                    "minimumFee": record.get("minimumFee") or "",
                    "willingToTravel": record.get("willingToTravel") or False,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "instagramHandle": record.get("instagramHandle") or "",
                    "createdAt": str(record.get("createdAt") or ""),
                },
            })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════════════════
# Venue Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def search_venues(
    genre_preference: str = "",
    location: str = "",
    min_capacity: int = 0,
    live_music_only: bool = False,
    limit: int = 20,
) -> str:
    """
    Search for venues in the database.

    Args:
        genre_preference: Filter by genre preference (e.g. "Jazz", "Rock")
        location: Filter by location (e.g. "New York, NY", "Brooklyn")
        min_capacity: Minimum venue capacity (e.g. 50, 100, 200)
        live_music_only: Only show venues that host live music
        limit: Max results to return (default 20)

    Returns:
        List of matching venues with name, location, capacity, genre preferences, etc.
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        where_clauses = []
        params = {}

        if genre_preference:
            where_clauses.append(
                "any(g IN v.genrePreferences WHERE toLower(g) CONTAINS toLower($genre))"
            )
            params["genre"] = genre_preference

        if location:
            where_clauses.append("toLower(v.location) CONTAINS toLower($location)")
            params["location"] = location

        if min_capacity > 0:
            where_clauses.append("v.capacity >= $min_cap")
            params["min_cap"] = min_capacity

        if live_music_only:
            where_clauses.append("v.liveMusic = true")

        where_str = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
            MATCH (v:Venue)
            WHERE {where_str}
            RETURN v.id AS id, v.venueName AS venueName, v.email AS email,
                   v.description AS description, v.location AS location,
                   v.capacity AS capacity,
                   v.genrePreferences AS genrePreferences,
                   v.ambience AS ambience,
                   v.typicalBudget AS typicalBudget,
                   v.liveMusic AS liveMusic,
                   v.websiteUrl AS websiteUrl
            ORDER BY v.venueName
            LIMIT $limit
        """
        params["limit"] = limit

        results = []
        with db.session() as session:
            for record in session.run(query, params):
                results.append({
                    "id": record.get("id"),
                    "venueName": record.get("venueName"),
                    "location": record.get("location") or "",
                    "capacity": record.get("capacity") or 0,
                    "genrePreferences": record.get("genrePreferences") or [],
                    "ambience": record.get("ambience") or [],
                    "typicalBudget": record.get("typicalBudget") or "",
                    "liveMusic": record.get("liveMusic") or False,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "description": (record.get("description") or "")[:200],
                })

        return json.dumps({
            "status": "ok",
            "count": len(results),
            "venues": results,
        })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


@mcp.tool()
def get_venue(venue_id: str) -> str:
    """
    Get full details for a specific venue by ID.

    Args:
        venue_id: The venue's UUID

    Returns:
        Full venue profile
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        with db.session() as session:
            result = session.run(
                """
                MATCH (v:Venue {id: $id})
                RETURN v.id AS id, v.venueName AS venueName, v.email AS email,
                       v.description AS description, v.location AS location,
                       v.logoUrl AS logoUrl, v.capacity AS capacity,
                       v.genrePreferences AS genrePreferences,
                       v.ambience AS ambience,
                       v.typicalBudget AS typicalBudget,
                       v.liveMusic AS liveMusic,
                       v.websiteUrl AS websiteUrl,
                       v.bookingEmail AS bookingEmail,
                       v.createdAt AS createdAt
                """,
                id=venue_id,
            )
            record = result.single()
            if not record:
                return json.dumps({
                    "status": "not_found",
                    "message": f"No venue found with id: {venue_id}",
                })

            return json.dumps({
                "status": "ok",
                "venue": {
                    "id": record.get("id"),
                    "venueName": record.get("venueName"),
                    "email": record.get("email"),
                    "description": record.get("description") or "",
                    "location": record.get("location") or "",
                    "logoUrl": record.get("logoUrl") or "",
                    "capacity": record.get("capacity") or 0,
                    "genrePreferences": record.get("genrePreferences") or [],
                    "ambience": record.get("ambience") or [],
                    "typicalBudget": record.get("typicalBudget") or "",
                    "liveMusic": record.get("liveMusic") or False,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "bookingEmail": record.get("bookingEmail") or "",
                    "createdAt": str(record.get("createdAt") or ""),
                },
            })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════════════════
# Promoter Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def search_promoters(
    specialty: str = "",
    location: str = "",
    accepting_artists: bool = False,
    limit: int = 20,
) -> str:
    """
    Search for promoters in the database.

    Args:
        specialty: Filter by genre specialty (e.g. "Jazz", "Electronic", "Rock")
        location: Filter by location (e.g. "New York, NY")
        accepting_artists: Only show promoters currently accepting new artists
        limit: Max results to return (default 20)

    Returns:
        List of matching promoters with name, specialties, roster size, etc.
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        where_clauses = []
        params = {}

        if specialty:
            where_clauses.append(
                "any(g IN p.genreSpecialties WHERE toLower(g) CONTAINS toLower($specialty))"
            )
            params["specialty"] = specialty

        if location:
            where_clauses.append("toLower(p.location) CONTAINS toLower($location)")
            params["location"] = location

        if accepting_artists:
            where_clauses.append("p.acceptingNewArtists = true")

        where_str = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
            MATCH (p:Promoter)
            WHERE {where_str}
            RETURN p.id AS id, p.businessName AS businessName, p.email AS email,
                   p.bio AS bio, p.location AS location,
                   p.genreSpecialties AS genreSpecialties,
                   p.eventTypes AS eventTypes,
                   p.acceptingNewArtists AS acceptingNewArtists,
                   p.currentRosterSize AS currentRosterSize,
                   p.websiteUrl AS websiteUrl
            ORDER BY p.businessName
            LIMIT $limit
        """
        params["limit"] = limit

        results = []
        with db.session() as session:
            for record in session.run(query, params):
                results.append({
                    "id": record.get("id"),
                    "businessName": record.get("businessName"),
                    "location": record.get("location") or "",
                    "genreSpecialties": record.get("genreSpecialties") or [],
                    "eventTypes": record.get("eventTypes") or [],
                    "acceptingNewArtists": record.get("acceptingNewArtists") or False,
                    "currentRosterSize": record.get("currentRosterSize") or 0,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "bio": (record.get("bio") or "")[:200],
                })

        return json.dumps({
            "status": "ok",
            "count": len(results),
            "promoters": results,
        })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


@mcp.tool()
def get_promoter(promoter_id: str) -> str:
    """
    Get full details for a specific promoter by ID.

    Args:
        promoter_id: The promoter's UUID

    Returns:
        Full promoter profile
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        with db.session() as session:
            result = session.run(
                """
                MATCH (p:Promoter {id: $id})
                RETURN p.id AS id, p.businessName AS businessName, p.email AS email,
                       p.bio AS bio, p.location AS location,
                       p.logoUrl AS logoUrl,
                       p.genreSpecialties AS genreSpecialties,
                       p.eventTypes AS eventTypes,
                       p.acceptingNewArtists AS acceptingNewArtists,
                       p.currentRosterSize AS currentRosterSize,
                       p.websiteUrl AS websiteUrl,
                       p.phone AS phone,
                       p.createdAt AS createdAt
                """,
                id=promoter_id,
            )
            record = result.single()
            if not record:
                return json.dumps({
                    "status": "not_found",
                    "message": f"No promoter found with id: {promoter_id}",
                })

            return json.dumps({
                "status": "ok",
                "promoter": {
                    "id": record.get("id"),
                    "businessName": record.get("businessName"),
                    "email": record.get("email"),
                    "bio": record.get("bio") or "",
                    "location": record.get("location") or "",
                    "logoUrl": record.get("logoUrl") or "",
                    "genreSpecialties": record.get("genreSpecialties") or [],
                    "eventTypes": record.get("eventTypes") or [],
                    "acceptingNewArtists": record.get("acceptingNewArtists") or False,
                    "currentRosterSize": record.get("currentRosterSize") or 0,
                    "websiteUrl": record.get("websiteUrl") or "",
                    "phone": record.get("phone") or "",
                    "createdAt": str(record.get("createdAt") or ""),
                },
            })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════════════════
# Graph / Matching Tools
# ═══════════════════════════════════════════════════════════════════════

@mcp.tool()
def find_venue_matches_for_musician(
    musician_id: str = "",
    genre: str = "",
    location: str = "",
    limit: int = 20,
) -> str:
    """
    Find venues that match a musician's genre(s). Provide either a musician_id
    to pull their genres from the database, or specify genre directly.

    This is the core matching feature — it finds venues whose genrePreferences
    overlap with the musician's genres, ordered by best match.

    Args:
        musician_id: Optional — musician UUID to pull genres from their profile
        genre: Optional — specify genre directly instead of (or in addition to) musician_id
        location: Optional — filter venues by location
        limit: Max results (default 20)

    Returns:
        Venues ranked by genre match score with match details
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        # Determine genres to match
        genres_to_match = set()

        if genre:
            genres_to_match.add(genre.lower())

        if musician_id:
            with db.session() as session:
                result = session.run(
                    "MATCH (m:Musician {id: $id}) RETURN m.genres AS genres",
                    id=musician_id,
                )
                record = result.single()
                if record and record.get("genres"):
                    for g in record["genres"]:
                        genres_to_match.add(g.lower())

        if not genres_to_match:
            return json.dumps({
                "status": "error",
                "error": "No genres specified. Provide a musician_id, genre, or both.",
            })

        # Build matching query
        genre_list = list(genres_to_match)
        params = {"genres": genre_list, "limit": limit}

        location_filter = ""
        if location:
            location_filter = "AND toLower(v.location) CONTAINS toLower($location)"
            params["location"] = location

        query = f"""
            MATCH (v:Venue)
            WHERE v.liveMusic = true {location_filter}
            WITH v, [g IN v.genrePreferences | toLower(g)] AS venueGenres
            WITH v, venueGenres,
                 size([g IN venueGenres WHERE g IN $genres]) AS matchCount,
                 $genres AS targetGenres
            WHERE matchCount > 0
            RETURN v.id AS id, v.venueName AS venueName, v.location AS location,
                   v.capacity AS capacity, v.genrePreferences AS genrePreferences,
                   v.typicalBudget AS typicalBudget,
                   v.ambience AS ambience,
                   matchCount,
                   size(venueGenres) AS totalPreferenceCount
            ORDER BY matchCount DESC, v.venueName
            LIMIT $limit
        """

        results = []
        with db.session() as session:
            for record in session.run(query, params):
                score = record["matchCount"]
                total = record["totalPreferenceCount"]
                results.append({
                    "id": record.get("id"),
                    "venueName": record.get("venueName"),
                    "location": record.get("location") or "",
                    "capacity": record.get("capacity") or 0,
                    "genrePreferences": record.get("genrePreferences") or [],
                    "typicalBudget": record.get("typicalBudget") or "",
                    "ambience": record.get("ambience") or [],
                    "matchScore": f"{score}/{total} genres matched",
                    "matchedGenres": list(genres_to_match),
                })

        return json.dumps({
            "status": "ok",
            "queryGenres": list(genres_to_match),
            "count": len(results),
            "venues": results,
        })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


@mcp.tool()
def db_stats() -> str:
    """
    Get database statistics: total musicians, venues, promoters.
    Useful for understanding what data is available.
    """
    try:
        db = _get_driver()
        if not db:
            return json.dumps({
                "status": "unavailable",
                "message": "Neo4j is not connected.",
            })

        with db.session() as session:
            musicians = session.run(
                "MATCH (m:Musician) RETURN count(m) AS count"
            ).single()["count"]

            venues = session.run(
                "MATCH (v:Venue) RETURN count(v) AS count"
            ).single()["count"]

            promoters = session.run(
                "MATCH (p:Promoter) RETURN count(p) AS count"
            ).single()["count"]

        return json.dumps({
            "status": "ok",
            "stats": {
                "musicians": musicians,
                "venues": venues,
                "promoters": promoters,
                "total": musicians + venues + promoters,
            },
        })

    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mcp.run(transport="stdio")
