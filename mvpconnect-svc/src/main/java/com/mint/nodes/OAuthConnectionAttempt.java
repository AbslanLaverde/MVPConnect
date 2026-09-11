package com.mint.nodes;

import com.mint.externalconnection.ExternalProvider;
import com.mint.oauth.OAuthAttemptStatus;
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

@Node("OAuthConnectionAttempt")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OAuthConnectionAttempt {
    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;
    private String stateHash;
    private String ownerId;
    private PersonaType ownerPersona;
    private ExternalProvider provider;
    private String returnTarget;
    private String encryptedCodeVerifier;
    private OAuthAttemptStatus status;
    private LocalDateTime expiresAt;
    private LocalDateTime consumedAt;
    private String connectionId;
    private String errorCode;
    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
