package com.mint.repositories;

import com.mint.nodes.Venue;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VenueRepository extends Neo4jRepository<Venue, String> {

    Optional<Venue> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("MATCH (v:Venue) WHERE ANY(g IN v.genrePreferences WHERE toLower(g) CONTAINS toLower($genre)) RETURN v")
    List<Venue> findByGenrePreferenceContaining(String genre);

    @Query("MATCH (v:Venue) WHERE toLower(v.location) CONTAINS toLower($location) RETURN v")
    List<Venue> findByLocationContaining(String location);

    @Query("MATCH (v:Venue) WHERE v.liveMusic = true AND v.capacity >= $minCapacity RETURN v")
    List<Venue> findByLiveMusicAndCapacity(Long minCapacity);
}
