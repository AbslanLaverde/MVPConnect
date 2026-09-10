package com.mint.repositories;

import com.mint.nodes.MediaAsset;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Map;

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
            MATCH (owner)-[membership:HAS_MEDIA]->(media:MediaAsset)
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
              AND media.status = 'READY'
              AND media.mediaType IN ['PROFILE_IMAGE', 'BANNER_IMAGE', 'GALLERY_IMAGE']
            RETURN media AS media, membership.sortOrder AS relationshipSortOrder
            """)
    List<CanonicalMediaEntry> findCanonicalMedia(
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

    @Query("""
            MATCH (owner), (selected:MediaAsset {id: $mediaId})
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
            OPTIONAL MATCH (owner)-[existing:HAS_MEDIA]->(current:MediaAsset)
            WHERE current.mediaType = 'BANNER_IMAGE'
            WITH owner, selected, collect(existing) AS relationships
            FOREACH (relationship IN relationships | DELETE relationship)
            MERGE (owner)-[:HAS_MEDIA]->(selected)
            """)
    void replaceCanonicalBannerMedia(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona,
            @Param("mediaId") String mediaId
    );

    @Query("""
            MATCH (owner)
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
            OPTIONAL MATCH (selected:MediaAsset)
            WHERE selected.id IN [item IN $items | item.mediaId]
            WITH owner, [media IN collect(selected) WHERE media IS NOT NULL] AS selectedMedia
            WHERE size(selectedMedia) = size($items)
            OPTIONAL MATCH (owner)-[existing:HAS_MEDIA]->(current:MediaAsset)
            WHERE current.mediaType = 'GALLERY_IMAGE'
            WITH owner, collect(existing) AS relationships
            FOREACH (relationship IN relationships | DELETE relationship)
            WITH owner
            UNWIND $items AS item
            MATCH (selected:MediaAsset {id: item.mediaId})
            MERGE (owner)-[membership:HAS_MEDIA]->(selected)
            SET membership.sortOrder = item.sortOrder
            """)
    void replaceCanonicalGalleryMedia(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona,
            @Param("items") List<Map<String, Object>> items
    );

    @Query("""
            MATCH (media:MediaAsset)
            WHERE media.updatedAt < $cutoff
              AND (media.status IN ['PENDING', 'FAILED']
                   OR (media.status = 'READY' AND NOT ()-[:HAS_MEDIA]->(media)))
            RETURN media
            ORDER BY media.updatedAt
            LIMIT $limit
            """)
    List<MediaAsset> findCleanupCandidates(
            @Param("cutoff") LocalDateTime cutoff,
            @Param("limit") long limit
    );
}
