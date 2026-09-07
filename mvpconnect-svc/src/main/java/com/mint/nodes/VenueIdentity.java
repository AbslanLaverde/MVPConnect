package com.mint.nodes;

import com.mint.venueidentity.VenueIdentityEnrichmentStatus;
import com.mint.venueidentity.VenueIdentityResolutionStatus;
import com.mint.venueidentity.VenueIdentitySource;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.support.UUIDStringGenerator;

import java.time.LocalDateTime;

@Node("VenueIdentity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VenueIdentity {

    public static final int CURRENT_ENRICHMENT_VERSION = 1;

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String name;
    private String normalizedName;
    private VenueIdentitySource source;
    private VenueIdentityResolutionStatus resolutionStatus;
    private VenueIdentityEnrichmentStatus enrichmentStatus;

    private String googlePlaceId;
    private String googleMapsUri;
    private String providerWebsiteUrl;
    private String googleBusinessStatus;

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

    private LocalDateTime googleLastSyncedAt;
    private Integer enrichmentVersion;
    private LocalDateTime lastEnrichedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
