package com.mint.nodes;

import com.mint.externalconnection.ExternalConnectionMethod;
import com.mint.externalconnection.ExternalConnectionStatus;
import com.mint.externalconnection.ExternalProvider;
import com.mint.onboarding.PersonaType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;
import java.util.List;

@Node("ExternalConnection")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExternalConnection {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String ownerId;
    private PersonaType ownerPersona;
    private String ownerProviderKey;
    private ExternalProvider provider;
    private ExternalConnectionMethod connectionMethod;
    private ExternalConnectionStatus status;
    private String providerAccountId;
    private String displayName;
    private String profileUrl;
    private String providerImageUrl;

    // Private credential fields. Explicit response DTOs never expose these values.
    private String encryptedAccessToken;
    private String encryptedRefreshToken;
    private LocalDateTime tokenExpiresAt;
    private Long credentialVersion;
    private List<String> grantedScopes;
    private String lastErrorCode;

    private LocalDateTime connectedAt;
    private LocalDateTime lastSyncedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
