package com.mint.repositories;

import com.mint.nodes.Musician;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Musician nodes
 * Extends Neo4jRepository to provide CRUD operations and custom queries
 */
@Repository
public interface MusicianRepository extends Neo4jRepository<Musician, String> {

    /**
     * Find a musician by their email address
     * Used for login and email uniqueness validation
     *
     * @param email the musician's email
     * @return Optional containing the musician if found
     */
    Optional<Musician> findByEmail(String email);

    /**
     * Check if a musician exists with the given email
     * Used for signup validation to prevent duplicate emails
     *
     * @param email the email to check
     * @return true if a musician with this email exists
     */
    boolean existsByEmail(String email);
}