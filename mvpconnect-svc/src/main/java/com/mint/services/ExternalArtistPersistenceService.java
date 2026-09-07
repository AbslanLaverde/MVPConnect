package com.mint.services;

import com.mint.nodes.ExternalArtist;
import com.mint.repositories.ExternalArtistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExternalArtistPersistenceService {

    private final ExternalArtistRepository repository;

    public ExternalArtistPersistenceService(ExternalArtistRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ExternalArtist create(ExternalArtist artist) {
        return repository.save(artist);
    }
}
