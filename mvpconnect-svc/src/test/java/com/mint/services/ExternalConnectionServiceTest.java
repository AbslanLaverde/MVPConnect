package com.mint.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.request.UpsertUrlExternalConnectionRequest;
import com.mint.dto.response.externalconnection.SelfExternalConnectionResponse;
import com.mint.exceptions.ExternalConnectionException;
import com.mint.externalconnection.ExternalConnectionMethod;
import com.mint.externalconnection.ExternalConnectionStatus;
import com.mint.externalconnection.ExternalProvider;
import com.mint.nodes.ExternalConnection;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.ExternalConnectionRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExternalConnectionServiceTest {

    @Mock private AuthenticatedPersonaProvider personaProvider;
    @Mock private ExternalConnectionRepository repository;
    @Mock private ExternalConnectionPersistenceService persistenceService;

    private ExternalConnectionService service;

    @BeforeEach
    void setUp() {
        service = new ExternalConnectionService(personaProvider, repository, persistenceService);
    }

    @Test
    void artistInstagramHandleCreatesOneOwnerScopedUnverifiedConnection() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("artist-1", PersonaType.MUSICIAN));
        when(repository.findByOwnerProviderKey("artist-1:INSTAGRAM")).thenReturn(Optional.empty());
        when(persistenceService.create(any())).thenAnswer(call -> {
            ExternalConnection connection = call.getArgument(0);
            connection.setId("connection-1");
            return connection;
        });

        SelfExternalConnectionResponse result = service.upsertUrl(
                new UpsertUrlExternalConnectionRequest(ExternalProvider.INSTAGRAM, "@glass.houses", null));

        ArgumentCaptor<ExternalConnection> captor = ArgumentCaptor.forClass(ExternalConnection.class);
        verify(persistenceService).create(captor.capture());
        assertEquals("artist-1:INSTAGRAM", captor.getValue().getOwnerProviderKey());
        assertEquals("https://www.instagram.com/glass.houses/", result.profileUrl());
        assertEquals(ExternalConnectionMethod.PROFILE_URL, result.connectionMethod());
        assertEquals(ExternalConnectionStatus.UNVERIFIED, result.status());
        verify(repository).linkOwner("artist-1", "MUSICIAN", "connection-1");
    }

    @Test
    void personaProviderAllowlistRejectsUnsupportedUrlProvider() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("venue-1", PersonaType.VENUE));

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.upsertUrl(new UpsertUrlExternalConnectionRequest(
                        ExternalProvider.BANDCAMP, "https://example.bandcamp.com", null)));

        assertEquals("INVALID_EXTERNAL_PROVIDER", exception.getCode());
    }

    @Test
    void selfDtoAndLegacyFallbackNeverExposeCredentialFields() {
        ExternalConnection connection = connection(ExternalProvider.YOUTUBE);
        connection.setEncryptedAccessToken("ciphertext-access");
        connection.setEncryptedRefreshToken("ciphertext-refresh");
        connection.setProviderImageUrl("https://yt3.example/channel.jpg");
        JsonNode json = new ObjectMapper().valueToTree(service.toSelf(connection));

        assertEquals("https://yt3.example/channel.jpg", json.get("providerImageUrl").asText());
        assertFalse(json.has("encryptedAccessToken"));
        assertFalse(json.has("encryptedRefreshToken"));
        assertFalse(json.has("providerAccountId"));

        when(repository.findOwned("artist-1", "MUSICIAN")).thenReturn(List.of());
        var fallback = service.selfConnections("artist-1", PersonaType.MUSICIAN, "legacy_artist");
        assertEquals(1, fallback.size());
        assertEquals("LEGACY_PROFILE", fallback.getFirst().actionCode());
    }

    @Test
    void disconnectDeletesOnlyTheAuthenticatedOwnersConnection() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("artist-1", PersonaType.MUSICIAN));
        ExternalConnection connection = connection(ExternalProvider.YOUTUBE);
        connection.setProviderImageUrl("https://yt3.example/channel.jpg");
        when(repository.findByOwnerProviderKey("artist-1:YOUTUBE")).thenReturn(Optional.of(connection));

        service.disconnect(ExternalProvider.YOUTUBE);

        verify(repository).deleteOwnedConnection("connection-1", "artist-1", "MUSICIAN");
    }

    @Test
    void publicDtoExposesOnlySafeProviderPresentationFields() {
        ExternalConnection connection = connection(ExternalProvider.YOUTUBE);
        connection.setDisplayName("Glass Houses");
        connection.setProfileUrl("https://youtube.com/channel/channel-1");
        connection.setProviderImageUrl("https://yt3.example/channel.jpg");
        connection.setEncryptedAccessToken("ciphertext-access");
        when(repository.findOwned("artist-1", "MUSICIAN")).thenReturn(List.of(connection));

        JsonNode json = new ObjectMapper().valueToTree(
                service.publicConnections("artist-1", PersonaType.MUSICIAN).getFirst());

        assertEquals("https://yt3.example/channel.jpg", json.get("providerImageUrl").asText());
        assertFalse(json.has("encryptedAccessToken"));
        assertFalse(json.has("providerAccountId"));
    }

    private ExternalConnection connection(ExternalProvider provider) {
        ExternalConnection connection = new ExternalConnection();
        connection.setId("connection-1");
        connection.setOwnerId("artist-1");
        connection.setOwnerPersona(PersonaType.MUSICIAN);
        connection.setProvider(provider);
        connection.setConnectionMethod(ExternalConnectionMethod.OAUTH);
        connection.setStatus(ExternalConnectionStatus.CONNECTED);
        return connection;
    }
}
