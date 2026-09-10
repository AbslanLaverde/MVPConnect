package com.mint.dto.response.profile;

import com.mint.dto.onboarding.shared.EquipmentItemDto;
import com.mint.dto.response.externalartist.ExternalArtistResponse;
import com.mint.dto.response.externalconnection.PublicExternalConnectionResponse;
import com.mint.onboarding.taxonomy.ArtistBookingStatus;
import com.mint.onboarding.taxonomy.DrawRangeCode;

import java.util.List;

public record PublicMusicianProfileResponse(
        String id,
        String name,
        String bio,
        PublicLocationResponse location,
        List<String> genres,
        List<String> vibes,
        List<String> eventTypes,
        ArtistBookingStatus bookingStatus,
        DrawRangeCode typicalDraw,
        Integer travelRadiusMiles,
        Boolean touring,
        Integer setLengthMinutes,
        List<EquipmentItemDto> equipmentBrought,
        String websiteUrl,
        String instagramHandle,
        PublicProfileMediaResponse profileImage,
        PublicProfileMediaResponse bannerImage,
        List<PublicProfileMediaResponse> galleryImages,
        List<PublicExternalConnectionResponse> externalConnections,
        ExternalArtistResponse spotifyArtistIdentity) {
}
