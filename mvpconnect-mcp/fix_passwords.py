#!/usr/bin/env python3
"""Fix plain-text passwords to BCrypt hashes for the Spring Boot backend."""
import bcrypt
from neo4j import GraphDatabase

pw_hash = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()
pw_venue = bcrypt.hashpw(b'venue123', bcrypt.gensalt()).decode()
pw_promo = bcrypt.hashpw(b'promo123', bcrypt.gensalt()).decode()

print(f"password123 -> {pw_hash[:40]}...")

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "changeme"))
count = 0

with driver.session() as session:
    # Fix musicians
    for r in session.run("MATCH (m:Musician) WHERE m.password <> $prefix RETURN m.email AS email", prefix="$2a$"):
        session.run("MATCH (m:Musician {email: $e}) SET m.password = $h", e=r["email"], h=pw_hash)
        print(f"  Musician: {r['email']}")
        count += 1

    # Fix venues
    for r in session.run("MATCH (v:Venue) WHERE v.password <> $prefix RETURN v.email AS email", prefix="$2a$"):
        session.run("MATCH (v:Venue {email: $e}) SET v.password = $h", e=r["email"], h=pw_venue)
        print(f"  Venue: {r['email']}")
        count += 1

    # Fix promoters
    for r in session.run("MATCH (p:Promoter) WHERE p.password <> $prefix RETURN p.email AS email", prefix="$2a$"):
        session.run("MATCH (p:Promoter {email: $e}) SET p.password = $h", e=r["email"], h=pw_promo)
        print(f"  Promoter: {r['email']}")
        count += 1

driver.close()
print(f"\nFixed {count} accounts. All passwords now use BCrypt.")
