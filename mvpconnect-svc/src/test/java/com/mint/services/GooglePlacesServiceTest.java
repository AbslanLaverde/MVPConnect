package com.mint.services;

import com.mint.config.GooglePlacesProperties;
import com.mint.dto.response.location.ResolvedLocationResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

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
}
