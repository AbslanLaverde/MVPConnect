package com.mint.services;

import com.mint.dto.request.UpsertUrlExternalConnectionRequest;
import com.mint.dto.response.externalconnection.PublicExternalConnectionResponse;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Set;

@Service
public class ExternalConnectionService {

    private static final Set<ExternalProvider> URL_PROVIDERS = EnumSet.of(
            ExternalProvider.INSTAGRAM, ExternalProvider.TIKTOK,
            ExternalProvider.FACEBOOK, ExternalProvider.BANDCAMP);

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final ExternalConnectionRepository repository;
    private final ExternalConnectionPersistenceService persistenceService;

    public ExternalConnectionService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            ExternalConnectionRepository repository,
            ExternalConnectionPersistenceService persistenceService) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.repository = repository;
        this.persistenceService = persistenceService;
    }

    @Transactional(readOnly = true)
    public List<SelfExternalConnectionResponse> currentConnections() {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        return selfConnections(owner.userId(), owner.persona());
    }

    @Transactional(readOnly = true)
    public List<SelfExternalConnectionResponse> selfConnections(String ownerId, PersonaType persona) {
        return repository.findOwned(ownerId, persona.name()).stream().map(this::toSelf).toList();
    }

    public List<SelfExternalConnectionResponse> selfConnections(
            String ownerId,
            PersonaType persona,
            String legacyInstagramHandle) {
        List<SelfExternalConnectionResponse> connections = new ArrayList<>(selfConnections(ownerId, persona));
        addLegacyInstagramSelf(connections, legacyInstagramHandle);
        return List.copyOf(connections);
    }

    @Transactional(readOnly = true)
    public List<PublicExternalConnectionResponse> publicConnections(String ownerId, PersonaType persona) {
        return repository.findOwned(ownerId, persona.name()).stream()
                .filter(connection -> connection.getStatus() == ExternalConnectionStatus.CONNECTED
                        || connection.getStatus() == ExternalConnectionStatus.UNVERIFIED)
                .map(this::toPublic)
                .toList();
    }

    public List<PublicExternalConnectionResponse> publicConnections(
            String ownerId,
            PersonaType persona,
            String legacyInstagramHandle) {
        List<PublicExternalConnectionResponse> connections = new ArrayList<>(publicConnections(ownerId, persona));
        if (connections.stream().noneMatch(item -> item.provider() == ExternalProvider.INSTAGRAM)) {
            String legacyUrl = legacyInstagramUrl(legacyInstagramHandle);
            if (legacyUrl != null) {
                connections.add(new PublicExternalConnectionResponse(
                        ExternalProvider.INSTAGRAM, null, legacyUrl, null));
            }
        }
        return List.copyOf(connections);
    }

    @Transactional
    public SelfExternalConnectionResponse upsertUrl(UpsertUrlExternalConnectionRequest request) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        requireAllowed(owner.persona(), request.provider(), ExternalConnectionMethod.PROFILE_URL);
        String profileUrl = normalizeProviderProfile(request.provider(), request.profile());
        String key = ownerProviderKey(owner.userId(), request.provider());
        ExternalConnection connection = repository.findByOwnerProviderKey(key).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        if (connection == null) {
            connection = new ExternalConnection();
            connection.setOwnerId(owner.userId());
            connection.setOwnerPersona(owner.persona());
            connection.setOwnerProviderKey(key);
            connection.setProvider(request.provider());
            connection.setCreatedAt(now);
        }
        connection.setConnectionMethod(ExternalConnectionMethod.PROFILE_URL);
        connection.setStatus(ExternalConnectionStatus.UNVERIFIED);
        connection.setDisplayName(normalizeDisplayName(request.displayName()));
        connection.setProfileUrl(profileUrl);
        connection.setConnectedAt(connection.getConnectedAt() == null ? now : connection.getConnectedAt());
        connection.setUpdatedAt(now);
        connection.setLastErrorCode(null);
        connection = saveRaceSafe(connection, key);
        repository.linkOwner(owner.userId(), owner.persona().name(), connection.getId());
        return toSelf(connection);
    }

    @Transactional
    public void disconnect(ExternalProvider provider) {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        ExternalConnection connection = repository.findByOwnerProviderKey(ownerProviderKey(owner.userId(), provider))
                .orElseThrow(ExternalConnectionException::notFound);
        repository.deleteOwnedConnection(connection.getId(), owner.userId(), owner.persona().name());
    }

    public void requireAllowed(PersonaType persona, ExternalProvider provider, ExternalConnectionMethod method) {
        boolean allowed = switch (persona) {
            case MUSICIAN -> method == ExternalConnectionMethod.PROFILE_URL
                    ? EnumSet.of(ExternalProvider.INSTAGRAM, ExternalProvider.TIKTOK, ExternalProvider.BANDCAMP)
                        .contains(provider)
                    : EnumSet.of(ExternalProvider.YOUTUBE, ExternalProvider.SOUNDCLOUD).contains(provider);
            case VENUE, PROMOTER -> method == ExternalConnectionMethod.PROFILE_URL
                    && EnumSet.of(ExternalProvider.INSTAGRAM, ExternalProvider.FACEBOOK, ExternalProvider.TIKTOK)
                        .contains(provider);
        };
        if (!allowed) throw ExternalConnectionException.invalidProvider();
    }

    public String ownerProviderKey(String ownerId, ExternalProvider provider) {
        return ownerId + ":" + provider.name();
    }

    public SelfExternalConnectionResponse toSelf(ExternalConnection connection) {
        return new SelfExternalConnectionResponse(
                connection.getId(), connection.getProvider(), connection.getConnectionMethod(),
                connection.getStatus(), connection.getDisplayName(), connection.getProfileUrl(),
                connection.getProviderImageUrl(),
                connection.getConnectedAt(), connection.getUpdatedAt(), connection.getLastErrorCode());
    }

    private PublicExternalConnectionResponse toPublic(ExternalConnection connection) {
        return new PublicExternalConnectionResponse(
                connection.getProvider(), connection.getDisplayName(), connection.getProfileUrl(),
                connection.getProviderImageUrl());
    }

    private ExternalConnection saveRaceSafe(ExternalConnection connection, String key) {
        if (connection.getId() != null) return repository.save(connection);
        try {
            return persistenceService.create(connection);
        } catch (DataIntegrityViolationException collision) {
            ExternalConnection winner = repository.findByOwnerProviderKey(key)
                    .orElseThrow(ExternalConnectionException::providerConnectionFailed);
            winner.setProfileUrl(connection.getProfileUrl());
            winner.setDisplayName(connection.getDisplayName());
            winner.setConnectionMethod(connection.getConnectionMethod());
            winner.setStatus(connection.getStatus());
            winner.setUpdatedAt(connection.getUpdatedAt());
            return repository.save(winner);
        }
    }

    private String normalizeProviderProfile(ExternalProvider provider, String raw) {
        if (!URL_PROVIDERS.contains(provider)) throw ExternalConnectionException.invalidProvider();
        String value = raw == null ? "" : raw.trim();
        if (provider == ExternalProvider.INSTAGRAM && isHandle(value)) {
            value = "https://www.instagram.com/" + handle(value, 30) + "/";
        } else if (provider == ExternalProvider.TIKTOK && isHandle(value)) {
            value = "https://www.tiktok.com/@" + handle(value, 24);
        }
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (!(scheme.equals("http") || scheme.equals("https")) || host.isBlank()
                    || !allowedHost(provider, host) || value.length() > 2048) {
                throw ExternalConnectionException.invalidUrl();
            }
            return uri.normalize().toString();
        } catch (IllegalArgumentException exception) {
            throw ExternalConnectionException.invalidUrl();
        }
    }

    private boolean allowedHost(ExternalProvider provider, String rawHost) {
        String host = rawHost.startsWith("www.") ? rawHost.substring(4) : rawHost;
        return switch (provider) {
            case INSTAGRAM -> host.equals("instagram.com");
            case TIKTOK -> host.equals("tiktok.com");
            case FACEBOOK -> host.equals("facebook.com") || host.equals("fb.com");
            case BANDCAMP -> host.equals("bandcamp.com") || host.endsWith(".bandcamp.com");
            default -> false;
        };
    }

    private boolean isHandle(String value) {
        return !value.contains("://") && !value.contains("/");
    }

    private String handle(String value, int maximumLength) {
        String handle = value.startsWith("@") ? value.substring(1) : value;
        if (handle.isBlank() || handle.length() > maximumLength || !handle.matches("[A-Za-z0-9._]+")) {
            throw ExternalConnectionException.invalidUrl();
        }
        return handle;
    }

    private String normalizeDisplayName(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private void addLegacyInstagramSelf(
            List<SelfExternalConnectionResponse> connections,
            String legacyInstagramHandle) {
        if (connections.stream().anyMatch(item -> item.provider() == ExternalProvider.INSTAGRAM)) return;
        String legacyUrl = legacyInstagramUrl(legacyInstagramHandle);
        if (legacyUrl != null) {
            connections.add(new SelfExternalConnectionResponse(
                    null, ExternalProvider.INSTAGRAM, ExternalConnectionMethod.PROFILE_URL,
                    ExternalConnectionStatus.UNVERIFIED, null, legacyUrl,
                    null, null, null, "LEGACY_PROFILE"));
        }
    }

    private String legacyInstagramUrl(String legacyInstagramHandle) {
        if (legacyInstagramHandle == null || legacyInstagramHandle.isBlank()) return null;
        try {
            return normalizeProviderProfile(ExternalProvider.INSTAGRAM, legacyInstagramHandle);
        } catch (ExternalConnectionException ignored) {
            return null;
        }
    }
}
