package com.mint.repositories;

import com.mint.nodes.Musician;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MusicianRepository extends Neo4jRepository<Musician, String> {

    Optional<Musician> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("MATCH (m:Musician) WHERE toLower(m.email) = toLower($email) RETURN count(m) > 0")
    boolean existsByEmailIgnoreCase(String email);

    @Query("MATCH (m:Musician) WHERE ANY(g IN m.genres WHERE toLower(g) CONTAINS toLower($genre)) RETURN m")
    List<Musician> findByGenreContaining(String genre);

    @Query("MATCH (m:Musician) WHERE toLower(m.location) CONTAINS toLower($location) RETURN m")
    List<Musician> findByLocationContaining(String location);

    @Query("MATCH (m:Musician) WHERE " +
           "ANY(g IN m.genres WHERE toLower(g) CONTAINS toLower($genre)) " +
           "AND toLower(m.location) CONTAINS toLower($location) RETURN m")
    List<Musician> findByGenreAndLocation(String genre, String location);
}
