package com.mint.youtube;

import com.mint.config.YouTubeOAuthProperties;
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

class YouTubeOAuthClientTest {

    private MockRestServiceServer server;
    private YouTubeOAuthClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder apiBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(apiBuilder).build();
        client = new YouTubeOAuthClient(
                RestClient.builder().baseUrl("https://oauth2.googleapis.com").build(),
                apiBuilder.baseUrl("https://www.googleapis.com").build(),
                new YouTubeOAuthProperties());
    }

    @Test
    void currentIdentityMapsTheHighestAvailableChannelThumbnail() {
        server.expect(requestTo(
                        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer provider-token"))
                .andRespond(withSuccess("""
                        {"items":[{
                          "id":"channel-1",
                          "snippet":{
                            "title":"Glass Houses",
                            "thumbnails":{
                              "default":{"url":"https://yt3.example/default.jpg"},
                              "medium":{"url":"https://yt3.example/medium.jpg"},
                              "high":{"url":"https://yt3.example/high.jpg"}
                            }
                          }
                        }]}
                        """, MediaType.APPLICATION_JSON));

        var identity = client.currentIdentity("provider-token");

        assertEquals("channel-1", identity.providerAccountId());
        assertEquals("Glass Houses", identity.displayName());
        assertEquals("https://yt3.example/high.jpg", identity.providerImageUrl());
        server.verify();
    }

    @Test
    void currentIdentityAcceptsMissingChannelThumbnail() {
        server.expect(requestTo(
                        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=1"))
                .andRespond(withSuccess("""
                        {"items":[{"id":"channel-1","snippet":{"title":"Glass Houses"}}]}
                        """, MediaType.APPLICATION_JSON));

        assertNull(client.currentIdentity("provider-token").providerImageUrl());
        server.verify();
    }
}
