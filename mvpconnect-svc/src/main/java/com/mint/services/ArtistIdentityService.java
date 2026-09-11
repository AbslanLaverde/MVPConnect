package com.mint.services;

import com.mint.dto.request.SetArtistIdentityRequest;
import com.mint.dto.response.externalartist.ExternalArtistResponse;
import com.mint.exceptions.ExternalArtistException;
import com.mint.externalartist.ExternalArtistSource;
import com.mint.nodes.ExternalArtist;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.ExternalArtistRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ArtistIdentityService {

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final ExternalArtistRepository repository;

    public ArtistIdentityService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            ExternalArtistRepository repository) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ExternalArtistResponse current() {
        AuthenticatedPersona owner = requireMusician();
        return findFor(owner.userId());
    }

    @Transactional(readOnly = true)
    public ExternalArtistResponse findFor(String musicianId) {
        return repository.findArtistIdentity(musicianId)
                .map(ExternalArtistResponse::from)
                .orElse(null);
    }

    @Transactional
    public ExternalArtistResponse replace(SetArtistIdentityRequest request) {
        AuthenticatedPersona owner = requireMusician();
        ExternalArtist artist = repository.findById(request.externalArtistId())
                .orElseThrow(() -> ExternalArtistException.invalid("External artist was not found."));
        if (artist.getSource() != ExternalArtistSource.SPOTIFY
                || artist.getSpotifyId() == null
                || artist.getSpotifyId().isBlank()) {
            throw ExternalArtistException.invalid("Own Artist identity must be resolved through Spotify.");
        }
        repository.replaceArtistIdentity(owner.userId(), artist.getId());
        return ExternalArtistResponse.from(artist);
    }

    @Transactional
    public void disconnect() {
        repository.disconnectArtistIdentity(requireMusician().userId());
    }

    private AuthenticatedPersona requireMusician() {
        AuthenticatedPersona owner = authenticatedPersonaProvider.current();
        if (owner.persona() != PersonaType.MUSICIAN) {
            throw ExternalArtistException.invalid("Own Artist identity is only available to Musician accounts.");
        }
        return owner;
    }
}
