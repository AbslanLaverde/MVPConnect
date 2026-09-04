package com.mint.onboarding;

public interface StructuredLocationOwner {

    void setLocation(String location);

    void setLocationDisplay(String value);

    void setLocationAddressLine1(String value);

    void setLocationAddressLine2(String value);

    void setLocationCity(String value);

    void setLocationState(String value);

    void setLocationPostalCode(String value);

    void setLocationCountry(String value);

    void setLocationLatitude(Double value);

    void setLocationLongitude(Double value);

    void setLocationNeighborhood(String value);

    void setLocationPlaceId(String value);
}
