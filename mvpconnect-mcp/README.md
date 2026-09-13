# Crescendo MCP Server

> Optional legacy-named local prototype; not required to run MVPConnect.
> Direct Neo4j reads do not inherit API authorization or public DTO privacy rules.
> Restrict use to trusted local databases. Seed/password utilities mutate data
> and are not part of normal application setup.

AI-native tools for Crescendo, the music industry marketplace connecting musicians, venues, and promoters.

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```bash
python crescendo_mcp.py
```

Connects to Neo4j at `bolt://localhost:7687` and the backend API at `http://localhost:8081`.

That API port is this prototype's code default. For the current Spring backend,
set the following before starting it:

```powershell
$env:CRESCENDO_API_URL = 'http://localhost:8080'
python crescendo_mcp.py
```

Database overrides are `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASS`, distinct from
Spring environment names. The historical Python 3.11 test claim below was not
reverified in the README audit; compatibility with current graph fields also
needs validation. See [environment configuration](../docs/ENVIRONMENT.md).

### Tools (10)

- `server_info` — Check connectivity status
- `login(email, password)` — Auth via backend
- `db_stats` — Count entities in DB
- `search_musicians(genre, location, max_fee, willing_to_travel)` — Find artists
- `get_musician(musician_id)` — Full musician profile
- `search_venues(genre_preference, location, min_capacity, live_music_only)` — Find venues
- `get_venue(venue_id)` — Full venue profile
- `search_promoters(specialty, location, accepting_artists)` — Find promoters
- `get_promoter(promoter_id)` — Full promoter profile
- `find_venue_matches_for_musician(musician_id, genre)` — Genre-based venue matching

Built with FastMCP. Tested with Python 3.11.

## Smoke Test

```bash
python _test_mcp.py
```
