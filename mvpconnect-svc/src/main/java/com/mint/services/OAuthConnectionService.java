package com.mint.services;

import com.mint.config.OAuthReturnProperties;
import com.mint.dto.request.OAuthConnectionStartRequest;
import com.mint.dto.response.externalconnection.OAuthConnectionAttemptResponse;
import com.mint.dto.response.externalconnection.OAuthConnectionStartResponse;
import com.mint.dto.response.externalconnection.SelfExternalConnectionResponse;
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
import com.mint.repositories.ExternalConnectionRepository;
import com.mint.repositories.OAuthConnectionAttemptRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import com.mint.security.TokenEncryptionService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OAuthConnectionService {

    private static final long EXPIRY_SKEW_SECONDS = 60;

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final ExternalConnectionService connectionService;
    private final ExternalConnectionPersistenceService connectionPersistenceService;
    private final ExternalConnectionRepository connectionRepository;
    private final OAuthConnectionAttemptRepository attemptRepository;
    private final TokenEncryptionService encryptionService;
    private final OAuthReturnProperties returnProperties;
    private final Map<ExternalProvider, OAuthProviderClient> clients;

    public OAuthConnectionService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            ExternalConnectionService connectionService,
            ExternalConnectionPersistenceService connectionPersistenceService,
            ExternalConnectionRepository connectionRepository,
            OAuthConnectionAttemptRepository attemptRepository,
            TokenEncryptionService encryptionService,
            OAuthReturnProperties returnProperties,
            List<OAuthProviderClient> clients) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.connectionService = connectionService;
        this.connectionPersistenceService = connectionPersistenceService;
        this.connectionRepository = connectionRepository;
        this.attemptRepository = attemptRepository;
        this.encryptionService = encryptionService;
        this.returnProperties = returnProperties;
        this.clients = new EnumMap<>(ExternalProvider.class);
        clients.forEach(client -> this.clients.put(client.provider(), client));
    }

    @Transactional
    public OAuthConnectionStartResponse start(
            ExternalProvider provider,
            OAuthConnectionStartRequest request) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        connectionService.requireAllowed(owner.persona(), provider, ExternalConnectionMethod.OAUTH);
        OAuthProviderClient client = client(provider);
        if (!client.configured()) throw ExternalConnectionException.providerUnavailable(provider.name());
        String returnTarget = validatedReturnTarget(request.returnTarget());
        String state = OAuthValues.randomValue(32);
        String verifier = OAuthValues.randomValue(64);
        LocalDateTime now = LocalDateTime.now();
        OAuthConnectionAttempt attempt = new OAuthConnectionAttempt();
        attempt.setId(UUID.randomUUID().toString());
        attempt.setStateHash(OAuthValues.sha256(state));
        attempt.setOwnerId(owner.userId());
        attempt.setOwnerPersona(owner.persona());
        attempt.setProvider(provider);
        attempt.setReturnTarget(returnTarget);
        attempt.setEncryptedCodeVerifier(encryptionService.encrypt(
                verifier, attemptAad(attempt, "verifier")));
        attempt.setStatus(OAuthAttemptStatus.PENDING);
        attempt.setExpiresAt(now.plus(returnProperties.getAttemptTtl()));
        attempt.setCreatedAt(now);
        attempt.setUpdatedAt(now);
        attemptRepository.save(attempt);
        URI authorizationUri = client.authorizationUri(state, OAuthValues.sha256(verifier));
        return new OAuthConnectionStartResponse(
                attempt.getId(), provider, authorizationUri.toString(), attempt.getExpiresAt());
    }

    @Transactional(noRollbackFor = ExternalConnectionException.class)
    public URI callback(
            ExternalProvider provider,
            String rawState,
            String code,
            String providerError) {
        if (rawState == null || rawState.isBlank()) throw ExternalConnectionException.oauthStateInvalid();
        String stateHash = OAuthValues.sha256(rawState);
        OAuthConnectionAttempt attempt = attemptRepository.findByStateHash(stateHash)
                .orElseThrow(ExternalConnectionException::oauthStateInvalid);
        if (attempt.getProvider() != provider) throw ExternalConnectionException.oauthStateInvalid();
        LocalDateTime now = LocalDateTime.now();
        if (attempt.getExpiresAt() == null || !attempt.getExpiresAt().isAfter(now)) {
            failAttempt(attempt, "OAUTH_STATE_EXPIRED");
            throw ExternalConnectionException.oauthStateExpired();
        }
        if (attempt.getConsumedAt() != null || attempt.getStatus() != OAuthAttemptStatus.PENDING
                || attemptRepository.consumeIfPending(attempt.getId(), stateHash, now) != 1) {
            throw ExternalConnectionException.oauthStateInvalid();
        }
        attempt.setConsumedAt(now);
        if (providerError != null || code == null || code.isBlank()) {
            failAttempt(attempt, "PROVIDER_AUTHORIZATION_DENIED");
            return resultUri(attempt);
        }

        try {
            String verifier = encryptionService.decrypt(
                    attempt.getEncryptedCodeVerifier(), attemptAad(attempt, "verifier"));
            OAuthProviderClient client = client(provider);
            OAuthProviderTokens tokens = client.exchange(code, verifier);
            OAuthProviderIdentity identity = client.currentIdentity(tokens.accessToken());
            ExternalConnection connection = saveOAuthConnection(attempt, identity, tokens);
            attempt.setStatus(OAuthAttemptStatus.SUCCEEDED);
            attempt.setConnectionId(connection.getId());
            attempt.setErrorCode(null);
            attempt.setEncryptedCodeVerifier(null);
            attempt.setUpdatedAt(LocalDateTime.now());
            attemptRepository.save(attempt);
            return resultUri(attempt);
        } catch (ExternalConnectionException exception) {
            failAttempt(attempt, exception.getCode());
            return resultUri(attempt);
        }
    }

    @Transactional(readOnly = true)
    public OAuthConnectionAttemptResponse status(String attemptId) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        OAuthConnectionAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(ExternalConnectionException::oauthStateInvalid);
        if (!owner.userId().equals(attempt.getOwnerId()) || owner.persona() != attempt.getOwnerPersona()) {
            throw ExternalConnectionException.oauthStateInvalid();
        }
        SelfExternalConnectionResponse connection = attempt.getConnectionId() == null ? null
                : connectionRepository.findById(attempt.getConnectionId())
                    .map(connectionService::toSelf).orElse(null);
        return new OAuthConnectionAttemptResponse(
                attempt.getId(), attempt.getProvider(), attempt.getStatus(), connection,
                attempt.getErrorCode(), attempt.getExpiresAt(), attempt.getUpdatedAt());
    }

    /**
     * Provider clients use this foundation for future profile reads. Refresh is
     * expiry-aware and uses a credential-version compare-and-set so rotating
     * SoundCloud refresh tokens cannot be overwritten by a concurrent refresh.
     */
    @Transactional
    public String accessTokenFor(String ownerId, ExternalProvider provider) {
        ExternalConnection connection = connectionRepository
                .findByOwnerProviderKey(connectionService.ownerProviderKey(ownerId, provider))
                .orElseThrow(ExternalConnectionException::notFound);
        if (connection.getConnectionMethod() != ExternalConnectionMethod.OAUTH) {
            throw ExternalConnectionException.invalidProvider();
        }
        if (connection.getTokenExpiresAt() == null
                || connection.getTokenExpiresAt().isAfter(LocalDateTime.now().plusSeconds(EXPIRY_SKEW_SECONDS))) {
            return decrypt(connection, connection.getEncryptedAccessToken(), "access");
        }
        String refreshToken = decrypt(connection, connection.getEncryptedRefreshToken(), "refresh");
        if (refreshToken == null || refreshToken.isBlank()) {
            markConnectionError(connection, "PROVIDER_RECONNECT_REQUIRED");
            throw ExternalConnectionException.providerConnectionFailed();
        }
        long version = connection.getCredentialVersion() == null ? 0 : connection.getCredentialVersion();
        OAuthProviderTokens refreshed;
        try {
            refreshed = client(provider).refresh(refreshToken);
        } catch (ExternalConnectionException exception) {
            return resolveRefreshFailure(connection, version, exception);
        } catch (RuntimeException exception) {
            return resolveRefreshFailure(
                    connection, version, ExternalConnectionException.providerConnectionFailed());
        }
        String nextRefreshToken = refreshed.refreshToken() == null
                ? refreshToken : refreshed.refreshToken();
        long updated = connectionRepository.updateCredentialsIfVersion(
                connection.getId(), version,
                encrypt(connection, refreshed.accessToken(), "access"),
                encrypt(connection, nextRefreshToken, "refresh"),
                LocalDateTime.now().plusSeconds(refreshed.expiresInSeconds()));
        if (updated == 1) return refreshed.accessToken();
        ExternalConnection winner = connectionRepository.findById(connection.getId())
                .orElseThrow(ExternalConnectionException::notFound);
        return decrypt(winner, winner.getEncryptedAccessToken(), "access");
    }

    private String resolveRefreshFailure(
            ExternalConnection connection,
            long expectedVersion,
            ExternalConnectionException failure) {
        ExternalConnection current = connectionRepository.findById(connection.getId())
                .orElseThrow(ExternalConnectionException::notFound);
        long currentVersion = current.getCredentialVersion() == null ? 0 : current.getCredentialVersion();
        if (currentVersion > expectedVersion) {
            return decrypt(current, current.getEncryptedAccessToken(), "access");
        }

        long marked = connectionRepository.markErrorIfVersion(
                connection.getId(), expectedVersion, failure.getCode());
        if (marked == 0) {
            ExternalConnection winner = connectionRepository.findById(connection.getId())
                    .orElseThrow(ExternalConnectionException::notFound);
            long winnerVersion = winner.getCredentialVersion() == null ? 0 : winner.getCredentialVersion();
            if (winnerVersion > expectedVersion) {
                return decrypt(winner, winner.getEncryptedAccessToken(), "access");
            }
        }
        throw failure;
    }

    private ExternalConnection saveOAuthConnection(
            OAuthConnectionAttempt attempt,
            OAuthProviderIdentity identity,
            OAuthProviderTokens tokens) {
        String key = connectionService.ownerProviderKey(attempt.getOwnerId(), attempt.getProvider());
        ExternalConnection connection = connectionRepository.findByOwnerProviderKey(key).orElse(null);
        boolean create = connection == null;
        if (create) {
            connection = new ExternalConnection();
            connection.setId(UUID.randomUUID().toString());
            connection.setOwnerId(attempt.getOwnerId());
            connection.setOwnerPersona(attempt.getOwnerPersona());
            connection.setOwnerProviderKey(key);
            connection.setProvider(attempt.getProvider());
            connection.setCreatedAt(LocalDateTime.now());
        }
        applyOAuth(connection, identity, tokens);
        try {
            connection = create
                    ? connectionPersistenceService.create(connection)
                    : connectionRepository.save(connection);
        } catch (DataIntegrityViolationException collision) {
            connection = connectionRepository.findByOwnerProviderKey(key)
                    .orElseThrow(ExternalConnectionException::providerConnectionFailed);
            applyOAuth(connection, identity, tokens);
            connection = connectionRepository.save(connection);
        }
        connectionRepository.linkOwner(attempt.getOwnerId(), attempt.getOwnerPersona().name(), connection.getId());
        return connection;
    }

    private void applyOAuth(
            ExternalConnection connection,
            OAuthProviderIdentity identity,
            OAuthProviderTokens tokens) {
        String existingRefreshToken = connection.getEncryptedRefreshToken() == null ? null
                : decrypt(connection, connection.getEncryptedRefreshToken(), "refresh");
        String refreshToken = tokens.refreshToken() == null ? existingRefreshToken : tokens.refreshToken();
        connection.setConnectionMethod(ExternalConnectionMethod.OAUTH);
        connection.setStatus(ExternalConnectionStatus.CONNECTED);
        connection.setProviderAccountId(identity.providerAccountId());
        connection.setDisplayName(identity.displayName());
        connection.setProfileUrl(identity.profileUrl());
        connection.setProviderImageUrl(safeProviderImageUrl(identity.providerImageUrl()));
        connection.setEncryptedAccessToken(encrypt(connection, tokens.accessToken(), "access"));
        connection.setEncryptedRefreshToken(encrypt(connection, refreshToken, "refresh"));
        connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(tokens.expiresInSeconds()));
        connection.setCredentialVersion(connection.getCredentialVersion() == null
                ? 1 : connection.getCredentialVersion() + 1);
        connection.setGrantedScopes(tokens.scopes());
        connection.setConnectedAt(LocalDateTime.now());
        connection.setLastSyncedAt(LocalDateTime.now());
        connection.setUpdatedAt(LocalDateTime.now());
        connection.setLastErrorCode(null);
    }

    private String safeProviderImageUrl(String value) {
        if (value == null || value.isBlank() || value.length() > 2048) return null;
        try {
            URI uri = URI.create(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null || uri.getHost().isBlank()
                    || uri.getUserInfo() != null) return null;
            return uri.normalize().toString();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private void markConnectionError(ExternalConnection connection, String code) {
        connection.setStatus(ExternalConnectionStatus.ERROR);
        connection.setLastErrorCode(code);
        connection.setUpdatedAt(LocalDateTime.now());
        connectionRepository.save(connection);
    }

    private void failAttempt(OAuthConnectionAttempt attempt, String code) {
        attempt.setStatus(OAuthAttemptStatus.FAILED);
        attempt.setErrorCode(code);
        attempt.setEncryptedCodeVerifier(null);
        attempt.setUpdatedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
    }

    private OAuthProviderClient client(ExternalProvider provider) {
        OAuthProviderClient client = clients.get(provider);
        if (client == null) throw ExternalConnectionException.invalidProvider();
        return client;
    }

    private String validatedReturnTarget(String rawTarget) {
        String target = rawTarget == null ? "" : rawTarget.trim();
        if (!returnProperties.getAllowedTargets().contains(target)) {
            throw ExternalConnectionException.invalidReturnTarget();
        }
        return target;
    }

    private URI resultUri(OAuthConnectionAttempt attempt) {
        return UriComponentsBuilder.fromUriString(attempt.getReturnTarget())
                .queryParam("attemptId", attempt.getId())
                .queryParam("provider", attempt.getProvider().name())
                .queryParam("status", attempt.getStatus().name())
                .build().encode().toUri();
    }

    private String attemptAad(OAuthConnectionAttempt attempt, String kind) {
        return "oauth-attempt:" + attempt.getId() + ":" + attempt.getOwnerId()
                + ":" + attempt.getProvider().name() + ":" + kind;
    }

    private String connectionAad(ExternalConnection connection, String kind) {
        return "external-connection:" + connection.getId() + ":" + connection.getOwnerId()
                + ":" + connection.getProvider().name() + ":" + kind;
    }

    private String encrypt(ExternalConnection connection, String value, String kind) {
        return encryptionService.encrypt(value, connectionAad(connection, kind));
    }

    private String decrypt(ExternalConnection connection, String value, String kind) {
        return encryptionService.decrypt(value, connectionAad(connection, kind));
    }
}
