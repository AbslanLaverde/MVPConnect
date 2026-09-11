package com.mint.services;

import com.mint.config.OAuthReturnProperties;
import com.mint.config.TokenEncryptionProperties;
import com.mint.dto.request.OAuthConnectionStartRequest;
import com.mint.exceptions.ExternalConnectionException;
import com.mint.externalconnection.ExternalConnectionMethod;
import com.mint.externalconnection.ExternalConnectionStatus;
import com.mint.externalconnection.ExternalProvider;
import com.mint.nodes.ExternalConnection;
import com.mint.nodes.OAuthConnectionAttempt;
import com.mint.oauth.OAuthAttemptStatus;
import com.mint.oauth.OAuthProviderClient;
import com.mint.oauth.OAuthProviderIdentity;
import com.mint.oauth.OAuthProviderTokens;
import com.mint.oauth.OAuthValues;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.ExternalConnectionRepository;
import com.mint.repositories.OAuthConnectionAttemptRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import com.mint.security.TokenEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuthConnectionServiceTest {

    @Mock private AuthenticatedPersonaProvider personaProvider;
    @Mock private ExternalConnectionService connectionService;
    @Mock private ExternalConnectionPersistenceService persistenceService;
    @Mock private ExternalConnectionRepository connectionRepository;
    @Mock private OAuthConnectionAttemptRepository attemptRepository;
    @Mock private OAuthProviderClient providerClient;

    private TokenEncryptionService encryptionService;
    private OAuthConnectionService service;

    @BeforeEach
    void setUp() {
        TokenEncryptionProperties properties = new TokenEncryptionProperties();
        properties.setKeyBase64(Base64.getEncoder().encodeToString(
                "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8)));
        encryptionService = new TokenEncryptionService(properties);
        when(providerClient.provider()).thenReturn(ExternalProvider.YOUTUBE);
        service = new OAuthConnectionService(
                personaProvider, connectionService, persistenceService, connectionRepository,
                attemptRepository, encryptionService, new OAuthReturnProperties(), List.of(providerClient));
    }

    @Test
    void startCreatesShortLivedHashedStateAndReturnsAuthorizationUrl() {
        when(personaProvider.current()).thenReturn(owner());
        when(providerClient.configured()).thenReturn(true);
        when(providerClient.authorizationUri(anyString(), anyString()))
                .thenReturn(URI.create("https://accounts.example/authorize"));
        when(attemptRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        var response = service.start(ExternalProvider.YOUTUBE,
                new OAuthConnectionStartRequest("mvpconnect://oauth/result"));

        ArgumentCaptor<OAuthConnectionAttempt> captor = ArgumentCaptor.forClass(OAuthConnectionAttempt.class);
        verify(attemptRepository).save(captor.capture());
        OAuthConnectionAttempt attempt = captor.getValue();
        assertEquals(OAuthAttemptStatus.PENDING, attempt.getStatus());
        assertFalse(attempt.getStateHash().isBlank());
        assertFalse(attempt.getEncryptedCodeVerifier().isBlank());
        assertEquals("https://accounts.example/authorize", response.authorizationUrl());
    }

    @Test
    void startRejectsOpenRedirectTargets() {
        when(personaProvider.current()).thenReturn(owner());
        when(providerClient.configured()).thenReturn(true);

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.start(ExternalProvider.YOUTUBE,
                        new OAuthConnectionStartRequest("https://evil.example/callback")));

        assertEquals("OAUTH_RETURN_TARGET_INVALID", exception.getCode());
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void callbackRejectsExpiredAndReusedState() {
        String state = "opaque-state";
        OAuthConnectionAttempt expired = attempt("attempt-1", state);
        expired.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(expired));

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.callback(ExternalProvider.YOUTUBE, state, "code", null));
        assertEquals("OAUTH_STATE_EXPIRED", exception.getCode());
        assertEquals(OAuthAttemptStatus.FAILED, expired.getStatus());

        OAuthConnectionAttempt reused = attempt("attempt-2", state);
        reused.setConsumedAt(LocalDateTime.now());
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(reused));
        assertEquals("OAUTH_STATE_INVALID", assertThrows(
                ExternalConnectionException.class,
                () -> service.callback(ExternalProvider.YOUTUBE, state, "code", null)).getCode());
    }

    @Test
    void callbackStateIsBoundToItsProvider() {
        String state = "opaque-state";
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(attempt("attempt-1", state)));

        ExternalConnectionException exception = assertThrows(
                ExternalConnectionException.class,
                () -> service.callback(ExternalProvider.SOUNDCLOUD, state, "code", null));

        assertEquals("OAUTH_STATE_INVALID", exception.getCode());
        verify(attemptRepository, never()).consumeIfPending(anyString(), anyString(), any());
    }

    @Test
    void providerDenialConsumesAttemptAndReturnsSafeFailureState() {
        String state = "opaque-state";
        OAuthConnectionAttempt attempt = attempt("attempt-1", state);
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(attempt));
        when(attemptRepository.consumeIfPending(anyString(), anyString(), any())).thenReturn(1L);
        when(attemptRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        URI result = service.callback(
                ExternalProvider.YOUTUBE, state, null, "access_denied provider detail");

        assertEquals(OAuthAttemptStatus.FAILED, attempt.getStatus());
        assertEquals("PROVIDER_AUTHORIZATION_DENIED", attempt.getErrorCode());
        assertFalse(result.toString().contains("access_denied"));
        assertFalse(result.toString().contains("provider+detail"));
    }

    @Test
    void attemptStatusIsBoundToTheAuthenticatedOwner() {
        when(personaProvider.current()).thenReturn(
                new AuthenticatedPersona("another-artist", PersonaType.MUSICIAN));
        when(attemptRepository.findById("attempt-1"))
                .thenReturn(Optional.of(attempt("attempt-1", "state")));

        assertEquals("OAUTH_STATE_INVALID", assertThrows(
                ExternalConnectionException.class,
                () -> service.status("attempt-1")).getCode());
    }

    @Test
    void callbackPersistsEncryptedConnectionAndReturnsOnlyOpaqueResultData() {
        String state = "opaque-state";
        OAuthConnectionAttempt attempt = attempt("attempt-1", state);
        String verifier = "pkce-verifier";
        attempt.setEncryptedCodeVerifier(encryptionService.encrypt(
                verifier, "oauth-attempt:attempt-1:artist-1:YOUTUBE:verifier"));
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(attempt));
        when(attemptRepository.consumeIfPending(anyString(), anyString(), any())).thenReturn(1L);
        when(providerClient.exchange("provider-code", verifier)).thenReturn(
                new OAuthProviderTokens("access-secret", "refresh-secret", 3600, List.of("read")));
        when(providerClient.currentIdentity("access-secret")).thenReturn(
                new OAuthProviderIdentity(
                        "channel-1", "Glass Houses",
                        "https://youtube.com/channel/channel-1",
                        "https://yt3.example/glass-houses.jpg"));
        when(connectionService.ownerProviderKey("artist-1", ExternalProvider.YOUTUBE))
                .thenReturn("artist-1:YOUTUBE");
        when(connectionRepository.findByOwnerProviderKey("artist-1:YOUTUBE")).thenReturn(Optional.empty());
        when(persistenceService.create(any())).thenAnswer(call -> call.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        URI result = service.callback(ExternalProvider.YOUTUBE, state, "provider-code", null);

        ArgumentCaptor<ExternalConnection> captor = ArgumentCaptor.forClass(ExternalConnection.class);
        verify(persistenceService).create(captor.capture());
        ExternalConnection connection = captor.getValue();
        assertEquals(ExternalConnectionStatus.CONNECTED, connection.getStatus());
        assertEquals("https://yt3.example/glass-houses.jpg", connection.getProviderImageUrl());
        assertFalse(connection.getEncryptedAccessToken().contains("access-secret"));
        assertFalse(connection.getEncryptedRefreshToken().contains("refresh-secret"));
        assertFalse(result.toString().contains("provider-code"));
        assertFalse(result.toString().contains("access-secret"));
        assertEquals(OAuthAttemptStatus.SUCCEEDED, attempt.getStatus());
    }

    @Test
    void reconnectRefreshesProviderImage() {
        ExternalConnection connection = connectedConnectionWithImage();
        connection.setProviderImageUrl("https://images.example/old.jpg");
        completeExistingConnectionCallback(connection, new OAuthProviderIdentity(
                "channel-1", "Updated", "https://youtube.com/channel/channel-1",
                "https://images.example/new.jpg"));

        assertEquals("https://images.example/new.jpg", connection.getProviderImageUrl());
    }

    @Test
    void reconnectClearsStaleProviderImageWhenProviderNoLongerReturnsOne() {
        ExternalConnection connection = connectedConnectionWithImage();
        completeExistingConnectionCallback(connection, new OAuthProviderIdentity(
                "channel-1", "Updated", "https://youtube.com/channel/channel-1", null));

        assertNull(connection.getProviderImageUrl());
    }

    @Test
    void callbackDoesNotPersistNonHttpsProviderImages() {
        ExternalConnection connection = connectedConnectionWithImage();
        completeExistingConnectionCallback(connection, new OAuthProviderIdentity(
                "channel-1", "Updated", "https://youtube.com/channel/channel-1",
                "http://images.example/unsafe.jpg"));

        assertNull(connection.getProviderImageUrl());
    }

    @Test
    void expiredTokenRefreshUsesCredentialVersionCompareAndSet() {
        ExternalConnection connection = expiredConnection(4L);
        when(connectionService.ownerProviderKey("artist-1", ExternalProvider.YOUTUBE))
                .thenReturn("artist-1:YOUTUBE");
        when(connectionRepository.findByOwnerProviderKey("artist-1:YOUTUBE"))
                .thenReturn(Optional.of(connection));
        when(providerClient.refresh("old-refresh")).thenReturn(
                new OAuthProviderTokens("new-access", "new-refresh", 3600, List.of("read")));
        when(connectionRepository.updateCredentialsIfVersion(
                anyString(), org.mockito.ArgumentMatchers.eq(4L), anyString(), anyString(), any()))
                .thenReturn(1L);

        assertEquals("new-access", service.accessTokenFor("artist-1", ExternalProvider.YOUTUBE));
        verify(connectionRepository).updateCredentialsIfVersion(
                anyString(), org.mockito.ArgumentMatchers.eq(4L), anyString(), anyString(), any());
    }

    @Test
    void refreshFailureUsesConcurrentWinnerWithoutMarkingItAsError() {
        ExternalConnection stale = expiredConnection(4L);
        ExternalConnection winner = expiredConnection(5L);
        winner.setTokenExpiresAt(LocalDateTime.now().plusHours(1));
        String aad = "external-connection:connection-1:artist-1:YOUTUBE:";
        winner.setEncryptedAccessToken(encryptionService.encrypt("winner-access", aad + "access"));
        when(connectionService.ownerProviderKey("artist-1", ExternalProvider.YOUTUBE))
                .thenReturn("artist-1:YOUTUBE");
        when(connectionRepository.findByOwnerProviderKey("artist-1:YOUTUBE"))
                .thenReturn(Optional.of(stale));
        when(providerClient.refresh("old-refresh"))
                .thenThrow(ExternalConnectionException.providerConnectionFailed());
        when(connectionRepository.findById("connection-1")).thenReturn(Optional.of(winner));

        assertEquals("winner-access", service.accessTokenFor("artist-1", ExternalProvider.YOUTUBE));
        verify(connectionRepository, never()).markErrorIfVersion(anyString(),
                org.mockito.ArgumentMatchers.anyLong(), anyString());
    }

    @Test
    void refreshFailureMarksOnlyTheExpectedCredentialVersion() {
        ExternalConnection connection = expiredConnection(4L);
        when(connectionService.ownerProviderKey("artist-1", ExternalProvider.YOUTUBE))
                .thenReturn("artist-1:YOUTUBE");
        when(connectionRepository.findByOwnerProviderKey("artist-1:YOUTUBE"))
                .thenReturn(Optional.of(connection));
        when(providerClient.refresh("old-refresh"))
                .thenThrow(ExternalConnectionException.providerConnectionFailed());
        when(connectionRepository.findById("connection-1")).thenReturn(Optional.of(connection));
        when(connectionRepository.markErrorIfVersion(
                "connection-1", 4L, "PROVIDER_CONNECTION_FAILED")).thenReturn(1L);

        ExternalConnectionException exception = assertThrows(ExternalConnectionException.class,
                () -> service.accessTokenFor("artist-1", ExternalProvider.YOUTUBE));

        assertEquals("PROVIDER_CONNECTION_FAILED", exception.getCode());
        verify(connectionRepository).markErrorIfVersion(
                "connection-1", 4L, "PROVIDER_CONNECTION_FAILED");
    }

    private ExternalConnection expiredConnection(long credentialVersion) {
        ExternalConnection connection = new ExternalConnection();
        connection.setId("connection-1");
        connection.setOwnerId("artist-1");
        connection.setOwnerPersona(PersonaType.MUSICIAN);
        connection.setProvider(ExternalProvider.YOUTUBE);
        connection.setConnectionMethod(ExternalConnectionMethod.OAUTH);
        connection.setCredentialVersion(credentialVersion);
        connection.setTokenExpiresAt(LocalDateTime.now().minusMinutes(1));
        String aad = "external-connection:connection-1:artist-1:YOUTUBE:";
        connection.setEncryptedAccessToken(encryptionService.encrypt("old-access", aad + "access"));
        connection.setEncryptedRefreshToken(encryptionService.encrypt("old-refresh", aad + "refresh"));
        return connection;
    }

    private ExternalConnection connectedConnectionWithImage() {
        ExternalConnection connection = new ExternalConnection();
        connection.setId("connection-1");
        connection.setOwnerId("artist-1");
        connection.setOwnerPersona(PersonaType.MUSICIAN);
        connection.setProvider(ExternalProvider.YOUTUBE);
        connection.setConnectionMethod(ExternalConnectionMethod.OAUTH);
        connection.setProviderImageUrl("https://images.example/old.jpg");
        return connection;
    }

    private void completeExistingConnectionCallback(
            ExternalConnection connection,
            OAuthProviderIdentity identity) {
        String state = "opaque-reconnect-state";
        String verifier = "pkce-verifier";
        OAuthConnectionAttempt attempt = attempt("attempt-reconnect", state);
        attempt.setEncryptedCodeVerifier(encryptionService.encrypt(
                verifier, "oauth-attempt:attempt-reconnect:artist-1:YOUTUBE:verifier"));
        when(attemptRepository.findByStateHash(OAuthValues.sha256(state)))
                .thenReturn(Optional.of(attempt));
        when(attemptRepository.consumeIfPending(anyString(), anyString(), any())).thenReturn(1L);
        when(providerClient.exchange("provider-code", verifier)).thenReturn(
                new OAuthProviderTokens("access-secret", "refresh-secret", 3600, List.of("read")));
        when(providerClient.currentIdentity("access-secret")).thenReturn(identity);
        when(connectionService.ownerProviderKey("artist-1", ExternalProvider.YOUTUBE))
                .thenReturn("artist-1:YOUTUBE");
        when(connectionRepository.findByOwnerProviderKey("artist-1:YOUTUBE"))
                .thenReturn(Optional.of(connection));
        when(connectionRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(attemptRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        service.callback(ExternalProvider.YOUTUBE, state, "provider-code", null);
    }

    private AuthenticatedPersona owner() {
        return new AuthenticatedPersona("artist-1", PersonaType.MUSICIAN);
    }

    private OAuthConnectionAttempt attempt(String id, String state) {
        OAuthConnectionAttempt attempt = new OAuthConnectionAttempt();
        attempt.setId(id);
        attempt.setStateHash(OAuthValues.sha256(state));
        attempt.setOwnerId("artist-1");
        attempt.setOwnerPersona(PersonaType.MUSICIAN);
        attempt.setProvider(ExternalProvider.YOUTUBE);
        attempt.setReturnTarget("mvpconnect://oauth/result");
        attempt.setStatus(OAuthAttemptStatus.PENDING);
        attempt.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        return attempt;
    }
}
