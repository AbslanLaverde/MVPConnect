package com.mint.repositories;

import com.mint.nodes.Promoter;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Promoter nodes
 * Extends Neo4jRepository to provide CRUD operations and custom queries
 */
@Repository
public interface PromoterRepository extends Neo4jRepository<Promoter, String> {

    /**
     * Find a promoter by their email address
     * Used for login and email uniqueness validation
     *
     * @param email the promoter's email
     * @return Optional containing the promoter if found
     */
    Optional<Promoter> findByEmail(String email);

    /**
     * Check if a promoter exists with the given email
     * Used for signup validation to prevent duplicate emails
     *
     * @param email the email to check
     * @return true if a promoter with this email exists
     */
    boolean existsByEmail(String email);
}
