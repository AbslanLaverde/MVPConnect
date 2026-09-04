package com.mint.nodes;

import com.mint.onboarding.OnboardingOwner;
import com.mint.onboarding.PersonaOnboardingStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Musician Node - Represents solo artists, bands, DJs, ensembles
 * Phase 1A: Core fields for POC (authentication + basic profile + matching tags)
 * Future phases will expand with additional social media, metrics, and AI-populated fields
 */
@Node("Musician")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Musician implements OnboardingOwner {

    // ========== CORE IDENTITY (Required for Auth) ==========
    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String name;                    // Artist or band name

    private String email;                   // Unique, used for login

    private String password;                // BCrypt hash, never plaintext

    // ========== BASIC PROFILE ==========
    private String bio;                     // About the musician/band

    private String location;                // City, State (e.g., "New York, NY")

    private String profileImageUrl;         // Main profile photo

    // ========== MUSIC IDENTITY (Tags for Matching) ==========
    private List<String> genres;            // e.g., ["Jazz", "Blues", "Soul"]

    private List<String> vibes;             // e.g., ["Energetic", "Sophisticated", "Chill"]

    // ========== BOOKING BASICS ==========
    private String minimumFee;              // e.g., "$500" - simple string for POC

    private Boolean willingToTravel;        // Can they travel for gigs?

    // ========== SOCIAL PROOF (1-2 key links for POC) ==========
    private String websiteUrl;              // Personal website or EPK

    private String instagramHandle;         // Primary social media

    // ========== ONBOARDING WORKFLOW ==========
    private PersonaOnboardingStatus onboardingStatus;

    private LocalDateTime onboardingCompletedAt;

    private Integer onboardingVersion;

    @Relationship(type = "HAS_ONBOARDING_DRAFT", direction = Relationship.Direction.OUTGOING)
    private List<OnboardingDraft> onboardingDrafts = new ArrayList<>();

    // ========== METADATA ==========
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}

