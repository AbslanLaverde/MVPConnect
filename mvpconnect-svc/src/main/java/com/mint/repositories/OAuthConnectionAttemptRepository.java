package com.mint.repositories;

import com.mint.nodes.OAuthConnectionAttempt;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OAuthConnectionAttemptRepository extends Neo4jRepository<OAuthConnectionAttempt, String> {
    Optional<OAuthConnectionAttempt> findByStateHash(String stateHash);

    @Query("""
            MATCH (attempt:OAuthConnectionAttempt {id: $id, stateHash: $stateHash})
            WHERE attempt.consumedAt IS NULL AND attempt.status = 'PENDING'
            SET attempt.consumedAt = $consumedAt, attempt.updatedAt = $consumedAt
            RETURN count(attempt)
            """)
    long consumeIfPending(
            @Param("id") String id,
            @Param("stateHash") String stateHash,
            @Param("consumedAt") LocalDateTime consumedAt
    );
}
