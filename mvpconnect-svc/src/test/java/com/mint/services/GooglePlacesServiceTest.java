package com.mint.services;

import com.mint.config.GooglePlacesProperties;
import com.mint.dto.response.location.ResolvedLocationResponse;
import com.mint.exceptions.VenueIdentityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class GooglePlacesServiceTest {

    private MockRestServiceServer server;
    private GooglePlacesService service;

    @BeforeEach
    void setUp() {
        GooglePlacesProperties properties = new GooglePlacesProperties();
        properties.setApiKey("test-key");
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new GooglePlacesService(
                builder.baseUrl(properties.getBaseUrl()).build(),
                properties
        );
    }

    @Test
    void citySuggestionsUseGooglePlacesNewAndExposeOnlySafeFields() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:autocomplete"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andExpect(header(
                        "X-Goog-FieldMask",
                        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text"
                ))
                .andExpect(content().json("""
                        {"input":"Mount Vernon","includedPrimaryTypes":["(cities)"],"languageCode":"en"}
                        """))
                .andRespond(withSuccess("""
                        {
                          "suggestions": [{
                            "placePrediction": {
                              "placeId": "place-1",
                              "text": {"text": "Mount Vernon, NY, USA"}
                            }
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        var result = service.suggest("  Mount Vernon  ", "city");

        assertEquals(1, result.size());
        assertEquals("place-1", result.getFirst().placeId());
        assertEquals("Mount Vernon, NY, USA", result.getFirst().displayName());
        server.verify();
    }

    @Test
    void placeDetailsAreMappedToTheCanonicalStructuredLocation() {
        server.expect(requestTo("https://places.googleapis.com/v1/places/place-1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andExpect(header("X-Goog-FieldMask", "id,formattedAddress,addressComponents,location"))
                .andRespond(withSuccess("""
                        {
                          "id": "place-1",
                          "formattedAddress": "10 Gramatan Ave, Mount Vernon, NY 10550, USA",
                          "addressComponents": [
                            {"longText":"10","shortText":"10","types":["street_number"]},
                            {"longText":"Gramatan Avenue","shortText":"Gramatan Ave","types":["route"]},
                            {"longText":"Mount Vernon","shortText":"Mount Vernon","types":["locality"]},
                            {"longText":"New York","shortText":"NY","types":["administrative_area_level_1"]},
                            {"longText":"United States","shortText":"US","types":["country"]},
                            {"longText":"10550","shortText":"10550","types":["postal_code"]}
                          ],
                          "location": {"latitude":40.9126,"longitude":-73.8371}
                        }
                        """, MediaType.APPLICATION_JSON));

        ResolvedLocationResponse result = service.resolve("place-1");

        assertEquals("10 Gramatan Avenue", result.addressLine1());
        assertEquals("Mount Vernon", result.city());
        assertEquals("NY", result.state());
        assertEquals("United States", result.country());
        assertEquals("10550", result.postalCode());
        assertEquals(40.9126, result.latitude());
        assertEquals(-73.8371, result.longitude());
        server.verify();
    }

    @Test
    void missingApiKeyLeavesManualEntryAvailableWithoutCallingGoogle() {
        GooglePlacesProperties properties = new GooglePlacesProperties();
        GooglePlacesService unconfigured = new GooglePlacesService(RestClient.create(), properties);

        assertEquals(0, unconfigured.suggest("Brooklyn", "CITY").size());
    }

    @Test
    void venueSearchRequestsOnlySafeIdentityFieldsAndMapsStructuredLocation() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andExpect(header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.formattedAddress,"
                                + "places.addressComponents,places.location,places.googleMapsUri,"
                                + "places.websiteUri,places.businessStatus,places.photos"))
                .andExpect(content().json("""
                        {"textQuery":"Baby's All Right","pageSize":10,"languageCode":"en"}
                        """))
                .andRespond(withSuccess("""
                        {"places":[{
                          "id":"place-venue-1",
                          "displayName":{"text":"Baby's All Right"},
                          "formattedAddress":"146 Broadway, Brooklyn, NY 11211, USA",
                          "googleMapsUri":"https://maps.google.com/venue",
                          "websiteUri":"https://babysallright.com",
                          "businessStatus":"OPERATIONAL",
                          "addressComponents":[
                            {"longText":"Brooklyn","shortText":"Brooklyn","types":["locality"]},
                            {"longText":"New York","shortText":"NY","types":["administrative_area_level_1"]},
                            {"longText":"United States","shortText":"US","types":["country"]}
                          ],
                          "location":{"latitude":40.71,"longitude":-73.96}
                        }]}
                        """, MediaType.APPLICATION_JSON));

        var result = service.searchVenues("  Baby's   All Right ").getFirst();

        assertEquals("place-venue-1", result.googlePlaceId());
        assertEquals("Baby's All Right", result.name());
        assertEquals("Brooklyn", result.locationCity());
        assertEquals("NY", result.locationState());
        assertEquals("https://maps.google.com/venue", result.googleMapsUri());
        server.verify();
    }

    @Test
    void venueSearchMapsFirstPhotoAndPreservesAllAuthorAttributionWithoutExposingApiKey() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.formattedAddress,"
                                + "places.addressComponents,places.location,places.googleMapsUri,"
                                + "places.websiteUri,places.businessStatus,places.photos"))
                .andRespond(withSuccess("""
                        {"places":[{
                          "id":"place-venue-1",
                          "displayName":{"text":"Baby's All Right"},
                          "googleMapsUri":"https://maps.google.com/venue",
                          "photos":[{
                            "name":"places/place-venue-1/photos/photo-1",
                            "googleMapsUri":"https://maps.google.com/photo/photo-1",
                            "authorAttributions":[
                              {
                                "displayName":"First Photographer",
                                "uri":"https://maps.google.com/contributor/first",
                                "photoUri":"https://lh3.googleusercontent.com/avatar-first"
                              },
                              {
                                "displayName":"Second Photographer",
                                "uri":"https://maps.google.com/contributor/second",
                                "photoUri":"https://lh3.googleusercontent.com/avatar-second"
                              }
                            ]
                          }]
                        }]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://places.googleapis.com/v1/places/place-venue-1/photos/photo-1/media"
                        + "?maxWidthPx=640&maxHeightPx=480&skipHttpRedirect=true"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Goog-Api-Key", "test-key"))
                .andRespond(withSuccess("""
                        {"photoUri":"https://lh3.googleusercontent.com/venue-photo=s640"}
                        """, MediaType.APPLICATION_JSON));

        var photo = service.searchVenues("Baby's All Right").getFirst().photo();

        assertNotNull(photo);
        assertEquals("https://lh3.googleusercontent.com/venue-photo=s640", photo.url());
        assertEquals("https://maps.google.com/photo/photo-1", photo.googleMapsUri());
        assertEquals(2, photo.authorAttributions().size());
        assertEquals("First Photographer", photo.authorAttributions().getFirst().displayName());
        assertFalse(photo.url().contains("test-key"));
        server.verify();
    }

    @Test
    void photoMediaFailureDoesNotFailVenueSearch() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andRespond(withSuccess("""
                        {"places":[{
                          "id":"place-venue-1",
                          "displayName":{"text":"Baby's All Right"},
                          "photos":[{"name":"places/place-venue-1/photos/expired-photo"}]
                        }]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://places.googleapis.com/v1/places/place-venue-1/photos/expired-photo/media"
                        + "?maxWidthPx=640&maxHeightPx=480&skipHttpRedirect=true"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).body("expired provider photo test-key"));

        var result = service.searchVenues("Baby's All Right").getFirst();

        assertEquals("place-venue-1", result.googlePlaceId());
        assertNull(result.photo());
        server.verify();
    }

    @Test
    void localGoogleIdentityCanLoadFreshPhotoPresentationByStoredPlaceId() {
        server.expect(requestTo("https://places.googleapis.com/v1/places/place-venue-1"))
                .andExpect(header("X-Goog-FieldMask", "id,googleMapsUri,photos"))
                .andRespond(withSuccess("""
                        {
                          "id":"place-venue-1",
                          "googleMapsUri":"https://maps.google.com/venue",
                          "photos":[{
                            "name":"places/place-venue-1/photos/fresh-photo",
                            "authorAttributions":[{"displayName":"Venue Owner"}]
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://places.googleapis.com/v1/places/place-venue-1/photos/fresh-photo/media"
                        + "?maxWidthPx=640&maxHeightPx=480&skipHttpRedirect=true"))
                .andRespond(withSuccess("""
                        {"photoUri":"https://lh3.googleusercontent.com/fresh-venue-photo"}
                        """, MediaType.APPLICATION_JSON));

        var result = service.presentVenuePhoto("place-venue-1");

        assertNotNull(result);
        assertEquals("https://lh3.googleusercontent.com/fresh-venue-photo", result.url());
        assertEquals("Venue Owner", result.authorAttributions().getFirst().displayName());
        assertEquals("https://maps.google.com/venue", result.googleMapsUri());
        server.verify();
    }

    @Test
    void zeroVenueSearchResultsRemainDistinctFromProviderFailure() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andRespond(withSuccess("{\"places\":[]}", MediaType.APPLICATION_JSON));

        assertEquals(List.of(), service.searchVenues("Unknown Room"));
        server.verify();
    }

    @Test
    void providerFailureMapsToSafeUnavailableErrorWithoutRawResponseOrApiKey() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("provider-secret test-key internal failure"));

        VenueIdentityException exception = assertThrows(
                VenueIdentityException.class,
                () -> service.searchVenues("Baby's All Right")
        );

        assertEquals(VenueIdentityException.GOOGLE_PLACES_UNAVAILABLE, exception.getCode());
        assertFalse(exception.getMessage().contains("test-key"));
        assertFalse(exception.getMessage().contains("provider-secret"));
        server.verify();
    }

    @Test
    void providerTimeoutMapsToSafeUnavailableError() {
        server.expect(requestTo("https://places.googleapis.com/v1/places:searchText"))
                .andRespond(request -> {
                    throw new ResourceAccessException("simulated timeout containing test-key");
                });

        VenueIdentityException exception = assertThrows(
                VenueIdentityException.class,
                () -> service.searchVenues("Baby's All Right")
        );

        assertEquals(VenueIdentityException.GOOGLE_PLACES_UNAVAILABLE, exception.getCode());
        assertFalse(exception.getMessage().contains("test-key"));
        server.verify();
    }
}
