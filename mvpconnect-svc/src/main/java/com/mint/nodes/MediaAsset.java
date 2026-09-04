package com.mint.nodes;

import com.mint.media.MediaContext;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;
import com.mint.onboarding.PersonaType;
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

@Node("MediaAsset")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaAsset {

    @Id
    @GeneratedValue(UUIDStringGenerator.class)
    private String id;

    private String ownerId;
    private PersonaType ownerPersona;
    private MediaType mediaType;
    private MediaContext mediaContext;
    private String objectKey;
    private String originalFileName;
    private String mimeType;
    private Long sizeBytes;
    private Integer width;
    private Integer height;
    private Integer sortOrder;
    private MediaStatus status;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
