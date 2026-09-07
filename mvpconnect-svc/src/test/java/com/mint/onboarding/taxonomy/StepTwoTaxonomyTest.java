package com.mint.onboarding.taxonomy;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StepTwoTaxonomyTest {

    @Test
    void genreCodesMatchApprovedV1InOrder() {
        assertEquals(List.of(
                "ALTERNATIVE", "BLUES", "CLASSICAL", "COUNTRY", "ELECTRONIC",
                "EXPERIMENTAL", "FOLK", "FUNK", "GOSPEL", "HARDCORE", "HIP_HOP",
                "INDIE", "JAZZ", "LATIN", "METAL", "POP", "PUNK", "R_AND_B",
                "REGGAE", "ROCK", "SINGER_SONGWRITER", "SOUL"
        ), names(GenreCode.values()));
    }

    @Test
    void vibeCodesMatchApprovedV1InOrder() {
        assertEquals(List.of(
                "ATMOSPHERIC", "DARK", "DREAMY", "ENERGETIC", "EXPERIMENTAL",
                "GRITTY", "GROOVY", "HEAVY", "INTIMATE", "MELLOW", "RAW",
                "RELAXED", "THEATRICAL", "UPBEAT"
        ), names(VibeCode.values()));
    }

    @Test
    void eventTypeCodesMatchApprovedV1InOrder() {
        assertEquals(List.of(
                "CLUB_NIGHT", "COMMUNITY_EVENT", "CONCERT", "DJ_NIGHT", "FESTIVAL",
                "HOUSE_SHOW", "OPEN_MIC", "PRIVATE_EVENT", "RESIDENCY", "SHOWCASE"
        ), names(EventTypeCode.values()));
    }

    private List<String> names(Enum<?>[] values) {
        return Arrays.stream(values).map(Enum::name).toList();
    }
}
