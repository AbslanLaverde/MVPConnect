package com.mint.spotify;

import com.mint.exceptions.ExternalArtistException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SpotifyArtistClientTest {

    private MockRestServiceServer server;
    private SpotifyArtistClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        SpotifyTokenService tokenService = mock(SpotifyTokenService.class);
        when(tokenService.accessToken()).thenReturn("provider-token");
        client = new SpotifyArtistClient(
                builder.baseUrl("https://api.spotify.com").build(), tokenService);
    }

    @Test
    void searchMapsOnlySafeArtistIdentityFields() {
        server.expect(requestTo("https://api.spotify.com/v1/search?q=Interpol&type=artist&limit=10"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer provider-token"))
                .andRespond(withSuccess("""
                        {"artists":{"items":[{
                          "id":"spotify-1",
                          "name":"Interpol",
                          "uri":"spotify:artist:spotify-1",
                          "external_urls":{"spotify":"https://open.spotify.com/artist/spotify-1"},
                          "images":[{"url":"https://images.example/interpol.jpg"}],
                          "genres":["indie rock"],
                          "followers":{"total":1000}
                        }]}}
                        """, MediaType.APPLICATION_JSON));

        SpotifyArtistIdentity result = client.search("Interpol").getFirst();

        assertEquals("spotify-1", result.spotifyId());
        assertEquals("Interpol", result.name());
        assertEquals("https://images.example/interpol.jpg", result.spotifyImageUrl());
        server.verify();
    }

    @Test
    void rateLimitMapsToSafeProviderUnavailableErrorWithoutRawBody() {
        server.expect(requestTo("https://api.spotify.com/v1/search?q=Interpol&type=artist&limit=10"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS)
                        .body("provider-private-details"));

        ExternalArtistException exception = assertThrows(
                ExternalArtistException.class, () -> client.search("Interpol"));

        assertEquals(ExternalArtistException.SPOTIFY_UNAVAILABLE, exception.getCode());
        assertFalse(exception.getMessage().contains("provider-private-details"));
    }
}
