## Nodes Package

This package contains Neo4j node entities (equivalent to JPA @Entity classes).

### Node Entities:

- **Musician.java** - Represents musicians/bands (replaces Band.java)
- **Promoter.java** - Represents promoters
- **Venue.java** - Represents venues (NEW entity)

### Neo4j Annotations:
- `@Node` - Marks a class as a Neo4j node entity
- `@Id` - Marks the unique identifier field
- `@Property` - Maps to node properties
- `@Relationship` - Defines relationships to other nodes

### Purpose:
- Define the graph database schema
- Map Java objects to Neo4j nodes
- Establish relationships between entities

