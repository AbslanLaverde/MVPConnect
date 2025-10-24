package com.mint.repositories;

import com.mint.nodes.Venue;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Venue nodes
 * Extends Neo4jRepository to provide CRUD operations and custom queries
 */
@Repository
public interface VenueRepository extends Neo4jRepository<Venue, String> {

    /**
     * Find a venue by their email address
     * Used for login and email uniqueness validation
     *
     * @param email the venue's email
     * @return Optional containing the venue if found
     */
    Optional<Venue> findByEmail(String email);

    /**
     * Check if a venue exists with the given email
     * Used for signup validation to prevent duplicate emails
     *
     * @param email the email to check
     * @return true if a venue with this email exists
     */
    boolean existsByEmail(String email);
}

