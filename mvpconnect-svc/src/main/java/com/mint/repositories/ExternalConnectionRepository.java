package com.mint.repositories;

import com.mint.nodes.ExternalConnection;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExternalConnectionRepository extends Neo4jRepository<ExternalConnection, String> {

    Optional<ExternalConnection> findByOwnerProviderKey(String ownerProviderKey);

    List<ExternalConnection> findByOwnerIdAndOwnerPersonaOrderByProvider(
            String ownerId,
            com.mint.onboarding.PersonaType ownerPersona
    );

    @Query("""
            MATCH (owner), (connection:ExternalConnection {id: $connectionId})
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
            MERGE (owner)-[:HAS_EXTERNAL_CONNECTION]->(connection)
            """)
    void linkOwner(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona,
            @Param("connectionId") String connectionId
    );

    @Query("""
            MATCH (connection:ExternalConnection {id: $connectionId})
            WHERE connection.credentialVersion = $expectedVersion
            SET connection.encryptedAccessToken = $encryptedAccessToken,
                connection.encryptedRefreshToken = $encryptedRefreshToken,
                connection.tokenExpiresAt = $tokenExpiresAt,
                connection.credentialVersion = $expectedVersion + 1,
                connection.status = 'CONNECTED',
                connection.lastErrorCode = null,
                connection.lastSyncedAt = datetime(),
                connection.updatedAt = datetime()
            RETURN count(connection)
            """)
    long updateCredentialsIfVersion(
            @Param("connectionId") String connectionId,
            @Param("expectedVersion") long expectedVersion,
            @Param("encryptedAccessToken") String encryptedAccessToken,
            @Param("encryptedRefreshToken") String encryptedRefreshToken,
            @Param("tokenExpiresAt") LocalDateTime tokenExpiresAt
    );

    @Query("""
            MATCH (connection:ExternalConnection {id: $connectionId})
            WHERE connection.credentialVersion = $expectedVersion
            SET connection.status = 'ERROR',
                connection.lastErrorCode = $errorCode,
                connection.updatedAt = datetime()
            RETURN count(connection)
            """)
    long markErrorIfVersion(
            @Param("connectionId") String connectionId,
            @Param("expectedVersion") long expectedVersion,
            @Param("errorCode") String errorCode
    );

    @Query("""
            MATCH (connection:ExternalConnection)
            WHERE connection.ownerId = $ownerId AND connection.ownerPersona = $persona
            RETURN connection
            ORDER BY connection.provider
            """)
    List<ExternalConnection> findOwned(
            @Param("ownerId") String ownerId,
            @Param("persona") String persona
    );

    @Query("""
            MATCH (owner)-[:HAS_EXTERNAL_CONNECTION]->(connection:ExternalConnection {id: $connectionId})
            WHERE owner.id = $ownerId
              AND any(label IN labels(owner) WHERE toUpper(label) = $persona)
            DETACH DELETE connection
            """)
    void deleteOwnedConnection(
            @Param("connectionId") String connectionId,
            @Param("ownerId") String ownerId,
            @Param("persona") String persona
    );
}
