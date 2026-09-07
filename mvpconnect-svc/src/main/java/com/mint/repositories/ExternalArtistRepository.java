package com.mint.repositories;

import com.mint.nodes.ExternalArtist;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExternalArtistRepository extends Neo4jRepository<ExternalArtist, String> {

    Optional<ExternalArtist> findBySpotifyId(String spotifyId);

    @Query("""
            MATCH (artist:ExternalArtist)
            WHERE toLower(artist.name) CONTAINS $query
               OR artist.normalizedName CONTAINS $query
            RETURN artist
            ORDER BY CASE WHEN artist.normalizedName = $query THEN 0
                          WHEN artist.normalizedName STARTS WITH $query THEN 1
                          ELSE 2 END,
                     artist.name
            LIMIT $limit
            """)
    List<ExternalArtist> searchByName(String query, long limit);

    @Query("""
            MATCH (artist:ExternalArtist)
            WHERE artist.normalizedName = $normalizedName
              AND artist.source IN ['FREE_FORM', 'FREE_FORM_SPOTIFY_UNAVAILABLE']
            RETURN artist
            ORDER BY artist.createdAt
            LIMIT 1
            """)
    Optional<ExternalArtist> findReusableFreeForm(String normalizedName);

    @Query("""
            MATCH (artist:ExternalArtist)
            WHERE artist.source = 'FREE_FORM_SPOTIFY_UNAVAILABLE'
              AND artist.resolutionStatus = 'RETRY_SPOTIFY'
            RETURN artist
            ORDER BY artist.updatedAt
            LIMIT $limit
            """)
    List<ExternalArtist> findRetryableSpotifyCandidates(long limit);

    @Query("""
            MATCH (artist:ExternalArtist)
            WHERE artist.source = 'FREE_FORM'
              AND artist.resolutionStatus = 'UNRESOLVED'
            RETURN artist
            ORDER BY artist.updatedAt
            LIMIT $limit
            """)
    List<ExternalArtist> findUnresolvedFreeFormCandidates(long limit);

    @Query("""
            MATCH (artist:ExternalArtist)
            WHERE artist.enrichmentStatus = 'PENDING'
            RETURN artist
            ORDER BY artist.updatedAt
            LIMIT $limit
            """)
    List<ExternalArtist> findPendingEnrichmentCandidates(long limit);

    @Query("MATCH (artist:ExternalArtist) WHERE artist.id IN $ids RETURN artist.id")
    List<String> findExistingIds(List<String> ids);

    @Query("""
            MATCH (owner:Musician {id: $ownerId})
            MATCH (artist:ExternalArtist {id: $artistId})
            MERGE (owner)-[:SOUNDS_LIKE]->(artist)
            """)
    void linkSoundsLike(String ownerId, String artistId);

    @Query("""
            MATCH (owner:Venue {id: $ownerId})
            MATCH (artist:ExternalArtist {id: $artistId})
            MERGE (owner)-[:HAS_BOOKED]->(artist)
            """)
    void linkHasBooked(String ownerId, String artistId);

    @Query("""
            MATCH (owner:Promoter {id: $ownerId})
            MATCH (artist:ExternalArtist {id: $artistId})
            MERGE (owner)-[:HAS_WORKED_WITH]->(artist)
            """)
    void linkHasWorkedWith(String ownerId, String artistId);
}
