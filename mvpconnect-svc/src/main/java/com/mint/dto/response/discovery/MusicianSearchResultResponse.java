package com.mint.dto.response.discovery;

import com.mint.dto.response.profile.PublicLocationResponse;
import com.mint.dto.response.profile.PublicProfileMediaResponse;

import java.util.List;

public record MusicianSearchResultResponse(
        String id,
        String name,
        PublicLocationResponse location,
        List<String> genres,
        List<String> vibes,
        PublicProfileMediaResponse profileImage) {
}
