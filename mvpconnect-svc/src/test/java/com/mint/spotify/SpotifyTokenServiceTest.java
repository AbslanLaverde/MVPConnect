package com.mint.spotify;

import com.mint.config.SpotifyProperties;
import com.mint.exceptions.ExternalArtistException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SpotifyTokenServiceTest {

    private MockRestServiceServer server;
    private SpotifyProperties properties;
    private RestClient.Builder builder;

    @BeforeEach
    void setUp() {
        properties = new SpotifyProperties();
        properties.setClientId("test-client");
        properties.setClientSecret("test-secret");
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
    }

    @Test
    void requestsClientCredentialsTokenOnceAndReusesIt() {
        server.expect(once(), requestTo("https://accounts.spotify.com/api/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Basic dGVzdC1jbGllbnQ6dGVzdC1zZWNyZXQ="))
                .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().string("grant_type=client_credentials"))
                .andRespond(withSuccess("""
                        {"access_token":"private-test-token","expires_in":3600}
                        """, MediaType.APPLICATION_JSON));
        SpotifyTokenService service = service();

        assertEquals("private-test-token", service.accessToken());
        assertEquals("private-test-token", service.accessToken());
        server.verify();
    }

    @Test
    void refreshesTokenWhenItIsAlreadyInsideTheExpirySkew() {
        server.expect(requestTo("https://accounts.spotify.com/api/token"))
                .andRespond(withSuccess("""
                        {"access_token":"short-token","expires_in":1}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://accounts.spotify.com/api/token"))
                .andRespond(withSuccess("""
                        {"access_token":"fresh-token","expires_in":3600}
                        """, MediaType.APPLICATION_JSON));
        SpotifyTokenService service = service();

        assertEquals("short-token", service.accessToken());
        assertEquals("fresh-token", service.accessToken());
        server.verify();
    }

    @Test
    void missingCredentialsFailsOnlyTheProviderCallWithSafeError() {
        properties.setClientId("");
        properties.setClientSecret("");
        SpotifyTokenService service = service();

        ExternalArtistException exception = assertThrows(
                ExternalArtistException.class, service::accessToken);

        assertEquals(ExternalArtistException.SPOTIFY_UNAVAILABLE, exception.getCode());
        assertFalse(exception.getMessage().contains("client"));
        server.verify();
    }

    private SpotifyTokenService service() {
        return new SpotifyTokenService(
                builder.baseUrl(properties.getAccountsBaseUrl()).build(), properties);
    }
}
