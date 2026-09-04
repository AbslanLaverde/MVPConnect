package com.mint.dto.onboarding.venue;

import com.mint.onboarding.taxonomy.BookingMethod;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.VenueBookingStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static com.mint.dto.onboarding.shared.OnboardingNormalization.string;

public record VenueBookingStepRequest(
        @NotNull VenueBookingStatus bookingStatus,
        @NotNull BookingMethod bookingMethod,
        DrawRangeCode desiredArtistDraw,
        @Email @Size(max = 320) String bookingEmail) {

    public VenueBookingStepRequest {
        bookingEmail = string(bookingEmail);
    }
}
