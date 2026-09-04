package com.mint.repositories;

import com.mint.nodes.MediaAsset;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MediaAssetRepository extends Neo4jRepository<MediaAsset, String> {

    @Query("""
            MATCH (owner)-[:HAS_MEDIA]->(media:MediaAsset)
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
              AND media.mediaType = 'PROFILE_IMAGE'
              AND media.status = 'READY'
            RETURN media
            ORDER BY media.updatedAt DESC
            LIMIT 1
            """)
    Optional<MediaAsset> findCanonicalProfileMedia(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona
    );

    @Query("""
            MATCH (media:MediaAsset {id: $mediaId})
            DETACH DELETE media
            """)
    void deleteWithOnboardingRelationships(@Param("mediaId") String mediaId);

    @Query("""
            MATCH (owner), (selected:MediaAsset {id: $mediaId})
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
            OPTIONAL MATCH (owner)-[existing:HAS_MEDIA]->(current:MediaAsset)
            WHERE current.mediaType = 'PROFILE_IMAGE'
            WITH owner, selected, collect(existing) AS existingProfileRelationships
            FOREACH (relationship IN existingProfileRelationships | DELETE relationship)
            MERGE (owner)-[:HAS_MEDIA]->(selected)
            """)
    void replaceCanonicalProfileMedia(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona,
            @Param("mediaId") String mediaId
    );
}
