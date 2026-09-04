package com.mint.nodes;

import com.mint.onboarding.OnboardingOwner;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.onboarding.taxonomy.RosterSizeRange;
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
 * Promoter Node - Represents event promoters, booking agents, talent buyers
 * Phase 1A: Core fields for POC (authentication + basic profile + matching tags)
 * Future phases will expand with roster management, track record, and business metrics
 */
@Node("Promoter")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Promoter implements OnboardingOwner {

    // ========== CORE IDENTITY (Required for Auth) ==========
    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String businessName;            // Company or individual name

    private String email;                   // Unique, used for login

    private String password;                // BCrypt hash, never plaintext

    // ========== BASIC PROFILE ==========
    private String bio;                     // About the promoter/company

    private String location;                // City, State where they operate

    private String locationDisplay;
    private String locationAddressLine1;
    private String locationAddressLine2;
    private String locationCity;
    private String locationState;
    private String locationPostalCode;
    private String locationCountry;
    private Double locationLatitude;
    private Double locationLongitude;
    private String locationNeighborhood;
    private String locationPlaceId;

    private String logoUrl;                 // Company logo or profile image

    // ========== EXPERTISE (Tags for Matching) ==========
    private List<String> genreSpecialties; // e.g., ["Jazz", "Electronic", "Rock"]

    private List<String> eventTypes;       // e.g., ["Concerts", "Festivals", "Private Events"]

    private List<String> vibePreferences;

    // ========== BUSINESS BASICS ==========
    private Boolean acceptingNewArtists;   // Currently looking for new talent?

    private Integer currentRosterSize;     // Number of artists they represent

    private PromoterAcceptingStatus acceptingStatus;
    private RosterSizeRange rosterSizeRange;
    private List<String> connectionGoals;

    // ========== CONTACT INFO ==========
    private String websiteUrl;             // Business website

    private String phone;                  // Contact number

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
