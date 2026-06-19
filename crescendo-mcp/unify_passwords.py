#!/usr/bin/env python3
"""Set all passwords to 'password123' with BCrypt."""
import bcrypt
from neo4j import GraphDatabase

pw = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "changeme"))

with driver.session() as session:
    r = session.run("MATCH (n) RETURN count(n) AS c").single()
    count = r["c"]
    session.run("MATCH (n) SET n.password = $pw", pw=pw)
    print(f"Updated {count} nodes — all passwords now: password123")

driver.close()
