package com.mint.services;

import com.mint.nodes.ExternalConnection;
import com.mint.repositories.ExternalConnectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExternalConnectionPersistenceService {

    private final ExternalConnectionRepository repository;

    public ExternalConnectionPersistenceService(ExternalConnectionRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ExternalConnection create(ExternalConnection connection) {
        return repository.save(connection);
    }
}
