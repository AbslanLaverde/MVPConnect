package com.mint.nodes;

import com.mint.externalartist.ExternalArtistEnrichmentStatus;
import com.mint.externalartist.ExternalArtistResolutionStatus;
import com.mint.externalartist.ExternalArtistSource;
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

@Node("ExternalArtist")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExternalArtist {

    public static final int CURRENT_ENRICHMENT_VERSION = 1;

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String name;
    private String normalizedName;
    private ExternalArtistSource source;
    private ExternalArtistResolutionStatus resolutionStatus;
    private ExternalArtistEnrichmentStatus enrichmentStatus;
    private String spotifyId;
    private String spotifyUri;
    private String spotifyUrl;
    private String spotifyImageUrl;
    private LocalDateTime spotifyLastSyncedAt;
    private Integer enrichmentVersion;
    private LocalDateTime lastEnrichedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
