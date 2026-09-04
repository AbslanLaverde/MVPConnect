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
 * Venue Node - Represents performance spaces (clubs, bars, concert halls, etc.)
 * Phase 1A: Core fields for POC (authentication + basic profile + matching tags)
 * Future phases will expand with capacity details, technical specs, and AI-sourced data
 */
@Node("Venue")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Venue implements OnboardingOwner {

    // ========== CORE IDENTITY (Required for Auth) ==========
    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String venueName;               // Name of the venue

    private String email;                   // Unique, used for login

    private String password;                // BCrypt hash, never plaintext

    // ========== BASIC PROFILE ==========
    private String description;             // About the venue

    private String location;                // Full address or "City, State"

    private String logoUrl;                 // Venue logo/main image

    // ========== VENUE CHARACTERISTICS (Tags for Matching) ==========
    private Integer capacity;               // Max occupancy

    private List<String> genrePreferences;  // e.g., ["Jazz", "Blues", "Rock"]

    private List<String> ambience;          // e.g., ["Intimate", "Upscale", "Energetic"]

    // ========== BOOKING BASICS ==========
    private String typicalBudget;           // e.g., "$500-$1000" - simple string for POC

    private Boolean liveMusic;              // Does venue host live music?

    // ========== CONTACT INFO ==========
    private String websiteUrl;              // Venue website

    private String bookingEmail;            // Separate booking contact (optional)

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

