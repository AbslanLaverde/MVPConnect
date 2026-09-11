package com.mint.soundcloud;

import com.mint.config.SoundCloudOAuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SoundCloudOAuthClientTest {

    private MockRestServiceServer server;
    private SoundCloudOAuthClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder apiBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(apiBuilder).build();
        client = new SoundCloudOAuthClient(
                RestClient.builder().baseUrl("https://secure.soundcloud.com").build(),
                apiBuilder.baseUrl("https://api.soundcloud.com").build(),
                new SoundCloudOAuthProperties());
    }

    @Test
    void currentIdentityMapsAccountAvatar() {
        server.expect(requestTo("https://api.soundcloud.com/me"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "OAuth provider-token"))
                .andRespond(withSuccess("""
                        {
                          "urn":"soundcloud:users:42",
                          "username":"Glass Houses",
                          "permalink_url":"https://soundcloud.com/glass-houses",
                          "avatar_url":"https://i1.sndcdn.com/avatars-account-large.jpg"
                        }
                        """, MediaType.APPLICATION_JSON));

        var identity = client.currentIdentity("provider-token");

        assertEquals("soundcloud:users:42", identity.providerAccountId());
        assertEquals("Glass Houses", identity.displayName());
        assertEquals("https://i1.sndcdn.com/avatars-account-large.jpg", identity.providerImageUrl());
        server.verify();
    }

    @Test
    void currentIdentityAcceptsMissingAvatar() {
        server.expect(requestTo("https://api.soundcloud.com/me"))
                .andRespond(withSuccess("""
                        {"id":42,"username":"Glass Houses","permalink_url":"https://soundcloud.com/glass-houses"}
                        """, MediaType.APPLICATION_JSON));

        assertNull(client.currentIdentity("provider-token").providerImageUrl());
        server.verify();
    }
}
