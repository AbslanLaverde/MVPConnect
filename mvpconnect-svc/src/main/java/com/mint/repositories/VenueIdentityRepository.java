package com.mint.repositories;

import com.mint.nodes.VenueIdentity;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VenueIdentityRepository extends Neo4jRepository<VenueIdentity, String> {

    Optional<VenueIdentity> findByGooglePlaceId(String googlePlaceId);

    @Query("""
            MATCH (venue:VenueIdentity)
            WHERE toLower(venue.name) CONTAINS $query
               OR venue.normalizedName CONTAINS $query
            RETURN venue
            ORDER BY CASE WHEN venue.normalizedName = $query THEN 0
                          WHEN venue.normalizedName STARTS WITH $query THEN 1
                          ELSE 2 END,
                     venue.name,
                     venue.locationCity,
                     venue.locationState
            LIMIT $limit
            """)
    List<VenueIdentity> searchByName(String query, long limit);

    @Query("""
            MATCH (venue:VenueIdentity)
            WHERE venue.normalizedName = $normalizedName
              AND venue.source IN ['FREE_FORM', 'FREE_FORM_GOOGLE_UNAVAILABLE']
              AND (($city IS NULL AND venue.locationCity IS NULL)
                   OR toLower(venue.locationCity) = toLower($city))
              AND (($state IS NULL AND venue.locationState IS NULL)
                   OR toLower(venue.locationState) = toLower($state))
            RETURN venue
            ORDER BY venue.createdAt
            LIMIT 1
            """)
    Optional<VenueIdentity> findReusableFreeForm(
            String normalizedName,
            String city,
            String state
    );

    @Query("""
            MATCH (venue:VenueIdentity)
            WHERE venue.source = 'FREE_FORM_GOOGLE_UNAVAILABLE'
              AND venue.resolutionStatus = 'RETRY_GOOGLE'
            RETURN venue
            ORDER BY venue.updatedAt
            LIMIT $limit
            """)
    List<VenueIdentity> findRetryableGoogleCandidates(long limit);

    @Query("""
            MATCH (venue:VenueIdentity)
            WHERE venue.source = 'FREE_FORM'
              AND venue.resolutionStatus = 'UNRESOLVED'
            RETURN venue
            ORDER BY venue.updatedAt
            LIMIT $limit
            """)
    List<VenueIdentity> findUnresolvedFreeFormCandidates(long limit);

    @Query("""
            MATCH (venue:VenueIdentity)
            WHERE venue.enrichmentStatus = 'PENDING'
            RETURN venue
            ORDER BY venue.updatedAt
            LIMIT $limit
            """)
    List<VenueIdentity> findPendingEnrichmentCandidates(long limit);

    @Query("MATCH (venue:VenueIdentity) WHERE venue.id IN $ids RETURN venue.id")
    List<String> findExistingIds(List<String> ids);

    @Query("""
            MATCH (owner:Musician {id: $ownerId})
            MATCH (venue:VenueIdentity {id: $venueIdentityId})
            MERGE (owner)-[:PLAYED_AT]->(venue)
            """)
    void linkPlayedAt(String ownerId, String venueIdentityId);

    @Query("""
            MATCH (owner:Promoter {id: $ownerId})
            MATCH (venue:VenueIdentity {id: $venueIdentityId})
            MERGE (owner)-[:WORKS_WITH]->(venue)
            """)
    void linkWorksWith(String ownerId, String venueIdentityId);
}
