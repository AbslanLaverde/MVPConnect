package com.mint.authsession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.authsession.http.*;
import com.mint.config.AuthSessionHttpProperties;
import com.mint.config.CorsProperties;
import com.mint.dto.request.*;
import com.mint.dto.response.*;
import com.mint.onboarding.PersonaType;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Duration;
import java.util.List;

import static com.mint.authsession.SessionTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;

class AuthSessionHttpPolicyTest {
    private final AuthSessionHttpProperties properties = new AuthSessionHttpProperties();

    @Test void headerResolutionAndBrowserMetadataCannotSelectNative() {
        var cors = new CorsProperties(); cors.setAllowedOrigins(List.of("https://app.example.test"));
        var resolver = new AuthClientTransportResolver(properties, cors);
        var request = new MockHttpServletRequest("POST", "/auth/login");
        assertNull(resolver.resolve(request, false));
        assertThrows(AuthHttpException.class, () -> resolver.resolve(request, true));
        request.addHeader("X-MVP-Client", "WEB");
        request.addHeader("Origin", "https://app.example.test");
        assertEquals(SessionTransport.WEB, resolver.resolve(request, true));
        request.addHeader("X-MVP-Client", "native");
        assertThrows(AuthHttpException.class, () -> resolver.resolve(request, true));
        for (String header : List.of("Origin", "Sec-Fetch-Site", "Sec-Fetch-Mode", "Sec-Fetch-Dest", "Sec-Fetch-User")) {
            var browser = new MockHttpServletRequest("POST", "/auth/login");
            browser.addHeader("X-MVP-Client", "native"); browser.addHeader(header, "null");
            assertEquals(AuthHttpException.Code.AUTH_ORIGIN_FORBIDDEN,
                    assertThrows(AuthHttpException.class, () -> resolver.resolve(browser, true)).code());
        }
        var nativeRequest = new MockHttpServletRequest("POST", "/auth/login");
        nativeRequest.addHeader("X-MVP-Client", "native");
        assertEquals(SessionTransport.NATIVE, resolver.resolve(nativeRequest, true));
        nativeRequest.setCookies(new Cookie(properties.getCookieName(), "anything"));
        assertThrows(AuthHttpException.class, () -> resolver.resolve(nativeRequest, true));
    }

    @Test void cookieScopeDeletionAndLifetimeAreConsistent() {
        var clock = new MutableClock();
        var helper = new RefreshCookie(properties, clock);
        var cookie = helper.setRefreshCookie("opaque-value", session(START.plusSeconds(31), START.plusSeconds(60)));
        assertEquals(Duration.ofSeconds(31), cookie.getMaxAge());
        assertTrue(cookie.isHttpOnly()); assertTrue(cookie.isSecure());
        assertEquals("Lax", cookie.getSameSite()); assertEquals("/auth", cookie.getPath()); assertNull(cookie.getDomain());
        assertEquals(Duration.ofSeconds(20), helper.setRefreshCookie("opaque-value",
                session(START.plusSeconds(60), START.plusSeconds(20))).getMaxAge());
        var cleared = helper.clearRefreshCookie();
        assertEquals(cookie.getName(), cleared.getName()); assertEquals(cookie.getPath(), cleared.getPath());
        assertEquals(cookie.getDomain(), cleared.getDomain()); assertTrue(cleared.isHttpOnly()); assertTrue(cleared.isSecure());
        assertEquals(Duration.ZERO, cleared.getMaxAge()); assertEquals("", cleared.getValue());
        clock.set(START.plusSeconds(90));
        assertEquals(Duration.ZERO, helper.setRefreshCookie("opaque-value", session(START, START)).getMaxAge());
    }

    @Test void requestAndResponseSecretsAreRedactedAndWebHasNoRefreshField() throws Exception {
        var mapper = new ObjectMapper();
        var request = mapper.readValue("{\"refreshToken\":\"refresh-private\"}", RefreshTokenRequest.class);
        assertTrue(request.supplied()); assertEquals("refresh-private", request.credential());
        assertFalse(request.toString().contains("refresh-private"));
        assertTrue(mapper.readValue("{\"refreshToken\":null}", RefreshTokenRequest.class).supplied());
        for (String invalid : List.of("{\"token\":\"unexpected\"}", "{\"refreshToken\":42}",
                "{\"refreshToken\":\"first\",\"refreshToken\":\"second\"}")) {
            assertThrows(Exception.class, () -> mapper.readValue(invalid, RefreshTokenRequest.class));
        }
        var access = new SessionAccessResponse("access-private", "Bearer", 100, "session");
        var identity = new AuthIdentity("user", PersonaType.MUSICIAN, "email", "name");
        var web = new WebSessionResponse(access, identity);
        var nativeResponse = new NativeSessionResponse(access, identity, "refresh-private");
        var nativeRefresh = new NativeRefreshResponse(access, "refresh-private");
        assertFalse(mapper.valueToTree(web).has("refreshToken"));
        assertFalse(mapper.valueToTree(access).has("refreshToken"));
        assertEquals("refresh-private", mapper.valueToTree(nativeResponse).get("refreshToken").asText());
        for (Object response : List.of(access, web, nativeResponse, nativeRefresh)) {
            assertFalse(response.toString().contains("private"));
        }
        var musician = new MusicianSignupRequest(); musician.setPassword("password-private");
        var venue = new VenueSignupRequest(); venue.setPassword("password-private");
        var promoter = new PromoterSignupRequest(); promoter.setPassword("password-private");
        for (Object signup : List.of(musician, venue, promoter)) assertFalse(signup.toString().contains("password-private"));
    }
}
