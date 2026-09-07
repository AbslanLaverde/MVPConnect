package com.mint.services;

import com.mint.nodes.VenueIdentity;
import com.mint.repositories.VenueIdentityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VenueIdentityPersistenceService {

    private final VenueIdentityRepository repository;

    public VenueIdentityPersistenceService(VenueIdentityRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public VenueIdentity create(VenueIdentity identity) {
        return repository.save(identity);
    }
}
