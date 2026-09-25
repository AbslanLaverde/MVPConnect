package com.mint.authsession;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.authsession.http.*;
import com.mint.config.*;
import com.mint.controllers.AuthController;
import com.mint.observability.RequestLoggingFilter;
import com.mint.observability.ApplicationLoggingAspect;
import com.mint.repositories.*;
import com.mint.security.*;
import com.mint.services.AuthService;
import com.mint.services.AuthSessionService;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.neo4j.driver.*;
import org.neo4j.harness.Neo4j;
import org.neo4j.harness.Neo4jBuilders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.neo4j.config.AbstractNeo4jConfig;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.time.Duration;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import static com.mint.authsession.SessionTestSupport.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Actual MVC + security chain + password authentication + SDN saves + independent Bolt session transactions. */
@SpringJUnitConfig(AuthTransportIntegrationTest.TestConfig.class)
@WebAppConfiguration
@TestPropertySource(properties = "cors.allowed-origins=https://app.example.test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthTransportIntegrationTest {
    private static final String ORIGIN = "https://app.example.test";
    private static final String COOKIE = "__Secure-mvp-refresh";
    private static final String PASSWORD = "test-password-only";
    private static final String LEGACY_KEY = Base64.getEncoder().encodeToString(Jwts.SIG.HS512.key().build().getEncoded());
    @Autowired WebApplicationContext context;
    @Autowired Driver driver;
    @Autowired ObjectMapper mapper;
    @Autowired MutableClock clock;
    @Autowired AuthSessionRepository repository;
    @Autowired SessionJwtTokenProvider tokens;
    @Autowired RefreshCredentialGenerator credentials;
    @MockitoSpyBean AuthSessionService sessions;
    @MockitoSpyBean JwtTokenProvider legacy;
    @MockitoSpyBean SessionAccessTokenService access;
    private MockMvc mvc;

    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> LEGACY_KEY);
        registry.add("jwt.expiration", () -> "86400000");
    }

    @BeforeAll void schema() { new Neo4jSchemaInitializer(driver, "neo4j").run(null); }

    @BeforeEach void fixture() {
        query("MATCH (n) DETACH DELETE n", Map.of());
        clock.set(START);
        clearInvocations(legacy, sessions, access);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity())
                .addFilters(new RequestLoggingFilter()).build();
    }

    @ParameterizedTest @CsvSource({"musician,web", "musician,native", "venue,web", "venue,native", "promoter,web", "promoter,native"})
    void signupCommitsEachPersonaBeforeBindingSessionAndDeliversOnlyItsTransport(String persona, String transport) throws Exception {
        var result = signup(persona, transport);
        var body = json(result);
        String id = body.get("sessionId").asText();
        var stored = repository.find(id).orElseThrow();
        assertTrue(stored.ownerValid()); // Separate driver transaction saw the committed SDN persona.
        assertEquals(persona.toUpperCase(), stored.session().ownerPersona().name());
        assertEquals(transport.toUpperCase(), stored.session().transport().name());
        assertEquals(body.get("userId").asText(), stored.session().ownerId());
        assertEquals(persona + "@example.test", body.get("email").asText());
        assertEquals("Test Name", body.get("name").asText());
        assertEquals(1800, body.get("expiresIn").asInt());
        assertEquals(id, tokens.parse(body.get("accessToken").asText()).sessionId());
        assertDelivery(result, transport);
        verify(legacy, never()).generateToken(any());
        verify(legacy, never()).generateTokenFromEmail(anyString(), anyString(), anyString());
        mvc.perform(get("/auth-transport-test/protected").header("Authorization", "Bearer " + body.get("accessToken").asText()))
                .andExpect(status().isOk()).andExpect(content().string(body.get("userId").asText()));
    }

    @ParameterizedTest @CsvSource({"musician,web", "musician,native", "venue,web", "venue,native", "promoter,web", "promoter,native"})
    void sessionLoginAuthenticatesWithoutIssuingLegacyToken(String persona, String transport) throws Exception {
        signup(persona, transport);
        var result = mvc.perform(client(post("/auth/login"), transport).contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", persona + "@example.test", "password", PASSWORD))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store")).andReturn();
        assertEquals(2, countSessions());
        assertEquals(1800, json(result).get("expiresIn").asInt());
        assertDelivery(result, transport);
        verify(legacy, never()).generateToken(any());
        verify(legacy, never()).generateTokenFromEmail(anyString(), anyString(), anyString());
    }

    @ParameterizedTest @CsvSource({"musician", "venue", "promoter"})
    void headerlessSignupAndLoginKeepLegacyFrontendContract(String persona) throws Exception {
        var signup = signup(persona, null);
        var created = json(signup);
        assertLegacy(created);
        assertNull(signup.getResponse().getHeader("Set-Cookie"));
        assertEquals(0, countSessions());
        var login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", persona + "@example.test", "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        assertLegacy(json(login));
        assertNull(login.getResponse().getHeader("Set-Cookie"));
        assertEquals(0, countSessions());
    }

    @ParameterizedTest @CsvSource({"web", "native"})
    void refreshRotatesBeforeIssuingAccessAndReplayRevokesOnlyThatFamily(String transport) throws Exception {
        var first = signup("musician", transport);
        var original = json(first);
        String a = raw(first, transport);
        doAnswer(invocation -> {
            // This independent transaction must already see A consumed before any JWT is issued.
            String sessionId = invocation.getArgument(0);
            assertNotNull(repository.write(tx -> tx.credential(sessionId, credentials.hash(a)).orElseThrow()).consumedAt());
            assertNotEquals(credentials.hash(a), repository.find(sessionId).orElseThrow().session().currentRefreshHash());
            return invocation.callRealMethod();
        }).when(access).issueAccessResponse(original.get("sessionId").asText());
        var refreshed = mvc.perform(refresh(transport, a).header("Authorization", "Bearer expired-or-invalid-access"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store")).andReturn();
        String b = raw(refreshed, transport);
        assertNotEquals(a, b);
        String sid = original.get("sessionId").asText();
        assertEquals(sid, json(refreshed).get("sessionId").asText());
        assertEquals(sid, tokens.parse(json(refreshed).get("accessToken").asText()).sessionId());
        var stored = repository.find(sid).orElseThrow().session();
        assertEquals(credentials.hash(b), stored.currentRefreshHash());
        assertEquals(SessionTransport.valueOf(transport.toUpperCase()), stored.transport());
        assertNotNull(repository.write(tx -> tx.credential(sid, credentials.hash(a)).orElseThrow()).consumedAt());
        assertDelivery(refreshed, transport);
        // A separate login/device must survive a replay in this family.
        var other = sessions.createSession(stored.ownerId(), stored.ownerPersona(), stored.transport(), null);
        var replay = mvc.perform(refresh(transport, a)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID")).andReturn();
        assertFalse(replay.getResponse().getContentAsString().contains("REFRESH_REUSED"));
        assertFalse(replay.getResponse().getContentAsString().contains(a));
        assertEquals(RevocationReason.REFRESH_REUSE, repository.find(sid).orElseThrow().session().revocationReason());
        assertTrue(sessions.rotateRefreshCredential(other.refreshCredential().reveal(), stored.transport()).succeeded());
        mvc.perform(refresh(transport, b)).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSION_INVALID"));
        mvc.perform(get("/auth-transport-test/protected").header("Authorization", "Bearer " + json(refreshed).get("accessToken").asText()))
                .andExpect(status().isUnauthorized());
        if (transport.equals("web")) assertCleared(replay); else assertNull(replay.getResponse().getHeader("Set-Cookie"));
    }

    @ParameterizedTest @CsvSource({"web,native", "native,web"})
    void transportMismatchNeverConsumesOrRevokesCredential(String issuedTransport, String attemptedTransport) throws Exception {
        var first = signup("musician", issuedTransport);
        String secret = raw(first, issuedTransport);
        String sid = json(first).get("sessionId").asText();
        mvc.perform(refresh(attemptedTransport, secret)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID"));
        mvc.perform(logout(attemptedTransport, secret)).andExpect(status().isUnauthorized());
        assertNull(repository.find(sid).orElseThrow().session().revokedAt());
        assertNull(repository.write(tx -> tx.credential(sid, credentials.hash(secret)).orElseThrow()).consumedAt());
        mvc.perform(refresh(issuedTransport, secret)).andExpect(status().isOk());
    }

    @ParameterizedTest @CsvSource({"web", "native"})
    void unknownAndMissingRefreshAreGenericAndDoNotRevokeOtherSessions(String transport) throws Exception {
        var first = signup("musician", transport);
        for (String secret : new String[]{credentials.generate().reveal(), null}) {
            var result = mvc.perform(refresh(transport, secret)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("SESSION_INVALID")).andReturn();
            if (transport.equals("web")) assertCleared(result);
        }
        assertNull(repository.find(json(first).get("sessionId").asText()).orElseThrow().session().revokedAt());
    }

    @ParameterizedTest @CsvSource({"web,idle", "native,idle", "web,absolute", "native,absolute", "web,revoked", "native,revoked"})
    void expiredAndRevokedRefreshUseGenericTerminalFailure(String transport, String state) throws Exception {
        var first = signup("musician", transport);
        String secret = raw(first, transport);
        String sid = json(first).get("sessionId").asText();
        if (state.equals("revoked")) sessions.revokeSession(sid, RevocationReason.SECURITY_EVENT);
        else if (state.equals("idle")) clock.set(START.plus(Duration.ofDays(30)));
        else {
            for (int day : new int[]{29, 58, 87}) {
                clock.set(START.plus(Duration.ofDays(day)));
                secret = raw(mvc.perform(refresh(transport, secret)).andExpect(status().isOk()).andReturn(), transport);
            }
            clock.set(START.plus(Duration.ofDays(90)));
        }
        var failed = mvc.perform(refresh(transport, secret)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID")).andReturn();
        assertFalse(failed.getResponse().getContentAsString().contains(sid));
        assertFalse(failed.getResponse().getContentAsString().contains(secret));
        if (transport.equals("web")) assertCleared(failed);
        else assertNull(failed.getResponse().getHeader("Set-Cookie"));
    }

    @ParameterizedTest @CsvSource({"web", "native"})
    void absentBodyIsAllowedForWebRefreshAndMissingCredentialLogout(String transport) throws Exception {
        if (transport.equals("web")) {
            var first = signup("musician", transport);
            mvc.perform(client(post("/auth/refresh"), transport).cookie(new Cookie(COOKIE, raw(first, transport))))
                    .andExpect(status().isOk());
        }
        var result = mvc.perform(client(post("/auth/logout"), transport)).andExpect(status().isNoContent()).andReturn();
        if (transport.equals("web")) assertCleared(result);
    }

    @ParameterizedTest @CsvSource({"web", "native"})
    void logoutWorksWithExpiredAccessConsumedCredentialsAndIsIdempotent(String transport) throws Exception {
        var first = signup("musician", transport);
        String a = raw(first, transport);
        var refreshed = mvc.perform(refresh(transport, a)).andExpect(status().isOk()).andReturn();
        String b = raw(refreshed, transport);
        clock.set(START.plus(Duration.ofHours(1))); // All initial access tokens have expired.
        for (String secret : new String[]{a, a, b, null, credentials.generate().reveal()}) {
            var response = mvc.perform(logout(transport, secret)
                            .header("Authorization", "Bearer " + json(first).get("accessToken").asText()))
                    .andExpect(status().isNoContent()).andExpect(content().string("")).andReturn();
            if (transport.equals("web")) assertCleared(response); else assertNull(response.getResponse().getHeader("Set-Cookie"));
        }
        assertEquals(RevocationReason.EXPLICIT_LOGOUT, repository.find(json(first).get("sessionId").asText())
                .orElseThrow().session().revocationReason());
        mvc.perform(refresh(transport, b)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest @CsvSource({"web", "native"})
    void activeLogoutRevokesItsFamily(String transport) throws Exception {
        var first = signup("musician", transport);
        mvc.perform(logout(transport, raw(first, transport))).andExpect(status().isNoContent());
        assertEquals(RevocationReason.EXPLICIT_LOGOUT, repository.find(json(first).get("sessionId").asText())
                .orElseThrow().session().revocationReason());
    }

    @Test void browserNativeSelectionOriginFailuresAndMalformedTransportStopBeforeAuth() throws Exception {
        for (String path : List.of("/auth/login", "/auth/signup/musician", "/auth/signup/venue", "/auth/signup/promoter", "/auth/refresh", "/auth/logout")) {
            mvc.perform(post(path).header("X-MVP-Client", "native").header("Origin", ORIGIN)
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_ORIGIN_FORBIDDEN"))
                    .andExpect(header().doesNotExist("Set-Cookie"));
            mvc.perform(post(path).header("X-MVP-Client", "native").header("Sec-Fetch-Site", "same-origin")
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden());
            mvc.perform(post(path).header("X-MVP-Client", "web").header("Origin", "https://evil.example.test")
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_ORIGIN_FORBIDDEN"));
            mvc.perform(post(path).header("X-MVP-Client", "bogus")).andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("AUTH_TRANSPORT_INVALID"));
        }
        for (String path : List.of("/auth/refresh", "/auth/logout")) {
            mvc.perform(post(path)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_TRANSPORT_INVALID"));
            mvc.perform(post(path).header("X-MVP-Client", "web")).andExpect(status().isForbidden());
        }
        assertEquals(0, countSessions());
        verify(legacy, never()).generateToken(any());
    }

    @Test void mixedCredentialsAndNonJsonBodiesAreRejected() throws Exception {
        var first = signup("musician", "web"); String a = raw(first, "web");
        for (String path : List.of("/auth/refresh", "/auth/logout")) {
            for (String body : List.of("{\"refreshToken\":\"ignored\"}", "{\"refreshToken\":null}", "{\"unexpected\":1}")) {
                mvc.perform(client(post(path), "web").cookie(new Cookie(COOKIE, a))
                                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
            }
            mvc.perform(client(post(path), "native").cookie(new Cookie(COOKIE, a))
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("AUTH_TRANSPORT_INVALID"));
            mvc.perform(client(post(path), "web").cookie(new Cookie(COOKIE, a)).contentType("text/plain").content("{}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("AUTH_REQUEST_INVALID"))
                    .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                    .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        }
        mvc.perform(refresh("web", a)).andExpect(status().isOk()); // Rejections did not consume it.
    }

    @Test void infrastructureFailurePreservesCookieAndDoesNotPretendSessionInvalid() throws Exception {
        var first = signup("musician", "web"); String a = raw(first, "web");
        doThrow(new SessionStoreException()).when(sessions).rotateRefreshCredential(a, SessionTransport.WEB);
        mvc.perform(refresh("web", a)).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AUTH_SERVICE_UNAVAILABLE")).andExpect(header().doesNotExist("Set-Cookie"));
        doThrow(new SessionStoreException()).when(sessions).revokeRefreshSession(a, SessionTransport.WEB);
        mvc.perform(logout("web", a)).andExpect(status().isServiceUnavailable()).andExpect(header().doesNotExist("Set-Cookie"));
        assertNull(repository.find(json(first).get("sessionId").asText()).orElseThrow().session().revokedAt());
    }

    @ParameterizedTest @CsvSource({"musician,name", "venue,venueName", "promoter,businessName"})
    void signupSessionFailureLeavesCommittedAccountRecoverableByLogin(String persona, String nameField) throws Exception {
        doThrow(new SessionStoreException()).when(sessions).createSession(anyString(), any(), any(), any());
        mvc.perform(client(post("/auth/signup/" + persona), "web").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(nameField, "Test Name", "email", persona + "@example.test", "password", PASSWORD))))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("AUTH_SERVICE_UNAVAILABLE"))
                .andExpect(header().doesNotExist("Set-Cookie"));
        assertEquals(0, countSessions());
        doCallRealMethod().when(sessions).createSession(anyString(), any(), any(), any());
        mvc.perform(client(post("/auth/login"), "web").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("email", persona + "@example.test", "password", PASSWORD))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userType").value(persona.toUpperCase()));
        assertEquals(1, countSessions());
        verify(legacy, never()).generateTokenFromEmail(anyString(), anyString(), anyString());
    }

    @Test void httpAndApplicationLoggingNeverIncludeCredentialsOrSecretResponses() throws Exception {
        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger("com.mint");
        var previousLevel = logger.getLevel();
        var captured = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        captured.start();
        logger.addAppender(captured);
        logger.setLevel(ch.qos.logback.classic.Level.DEBUG);
        var secrets = new java.util.ArrayList<String>();
        secrets.add(PASSWORD);
        try {
            for (String transport : List.of("web", "native")) {
                var first = signup(transport.equals("web") ? "venue" : "musician", transport);
                secrets.add(raw(first, transport));
                secrets.add(json(first).get("accessToken").asText());
                var rotated = mvc.perform(refresh(transport, raw(first, transport))
                                .header("Authorization", "Bearer " + json(first).get("accessToken").asText()))
                        .andExpect(status().isOk()).andReturn();
                secrets.add(raw(rotated, transport));
                secrets.add(json(rotated).get("accessToken").asText());
                mvc.perform(logout(transport, raw(rotated, transport))).andExpect(status().isNoContent());
            }
            String messages = captured.list.stream().map(event -> event.getFormattedMessage()
                    + (event.getThrowableProxy() == null ? "" : ch.qos.logback.classic.spi.ThrowableProxyUtil.asString(event.getThrowableProxy())))
                    .collect(java.util.stream.Collectors.joining("\n"));
            assertTrue(messages.contains("http.request.completed"));
            assertTrue(messages.contains("app.operation.completed"));
            for (String secret : secrets) assertFalse(messages.contains(secret), "Credential appeared in application logs");
        } finally {
            logger.detachAppender(captured);
            captured.stop();
            logger.setLevel(previousLevel);
        }
    }

    @Test void trustedPreflightAllowsCustomHeaderWithCredentialsButUntrustedOriginsFail() throws Exception {
        mvc.perform(options("/auth/refresh").header("Origin", ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,authorization,x-mvp-client"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Allow-Headers", org.hamcrest.Matchers.containsString("x-mvp-client")));
        mvc.perform(options("/auth/refresh").header("Origin", "https://evil.example.test")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test void accessLifetimeAndCookieAreCappedAtRemainingAbsoluteLifetime() throws Exception {
        var first = signup("musician", "web"); String current = raw(first, "web");
        for (int day : new int[]{29, 58, 87}) {
            clock.set(START.plus(Duration.ofDays(day)));
            current = raw(mvc.perform(refresh("web", current)).andExpect(status().isOk()).andReturn(), "web");
        }
        clock.set(START.plus(Duration.ofDays(90)).minusSeconds(60));
        var result = mvc.perform(refresh("web", current)).andExpect(status().isOk()).andReturn();
        assertEquals(60, json(result).get("expiresIn").asLong());
        assertTrue(result.getResponse().getHeader("Set-Cookie").contains("Max-Age=60"));
    }

    @Test void incorrectPasswordUsesStableCodeAndNoNewSession() throws Exception {
        signup("musician", "native");
        mvc.perform(client(post("/auth/login"), "web").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"musician@example.test\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(header().doesNotExist("Set-Cookie"));
        assertEquals(1, countSessions());
    }

    private MvcResult signup(String persona, String transport) throws Exception {
        String nameField = switch (persona) { case "musician" -> "name"; case "venue" -> "venueName"; default -> "businessName"; };
        return mvc.perform(client(post("/auth/signup/" + persona), transport).contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of(nameField, "Test Name", "email", persona + "@example.test", "password", PASSWORD))))
                .andExpect(status().isCreated()).andReturn();
    }
    private MockHttpServletRequestBuilder client(MockHttpServletRequestBuilder request, String transport) {
        if (transport != null) request.header("X-MVP-Client", transport);
        if ("web".equals(transport)) request.header("Origin", ORIGIN);
        return request;
    }
    private MockHttpServletRequestBuilder refresh(String transport, String raw) throws Exception { return credentialRequest("/auth/refresh", transport, raw); }
    private MockHttpServletRequestBuilder logout(String transport, String raw) throws Exception { return credentialRequest("/auth/logout", transport, raw); }
    private MockHttpServletRequestBuilder credentialRequest(String path, String transport, String raw) throws Exception {
        var request = client(post(path), transport).contentType(MediaType.APPLICATION_JSON);
        if (transport.equals("web")) {
            if (raw != null) request.cookie(new Cookie(COOKIE, raw));
            return request.content("{}");
        }
        return request.content(raw == null ? "{}" : mapper.writeValueAsString(Map.of("refreshToken", raw)));
    }
    private JsonNode json(MvcResult result) throws Exception { return mapper.readTree(result.getResponse().getContentAsString()); }
    private String raw(MvcResult result, String transport) throws Exception {
        return transport.equals("web") ? java.net.HttpCookie.parse(result.getResponse().getHeader("Set-Cookie")).getFirst().getValue()
                : json(result).get("refreshToken").asText();
    }
    private void assertDelivery(MvcResult result, String transport) throws Exception {
        assertEquals("no-store", result.getResponse().getHeader("Cache-Control"));
        if (transport.equals("web")) {
            String cookie = result.getResponse().getHeader("Set-Cookie");
            assertNotNull(cookie); assertTrue(cookie.contains("HttpOnly")); assertTrue(cookie.contains("Secure"));
            assertTrue(cookie.contains("SameSite=Lax")); assertTrue(cookie.contains("Path=/auth")); assertFalse(cookie.contains("Domain="));
            assertFalse(json(result).has("refreshToken")); assertFalse(result.getResponse().getContentAsString().contains(raw(result, transport)));
            assertEquals(ORIGIN, result.getResponse().getHeader("Access-Control-Allow-Origin"));
        } else {
            assertNull(result.getResponse().getHeader("Set-Cookie")); assertTrue(json(result).get("refreshToken").asText().length() >= 43);
        }
    }
    private void assertCleared(MvcResult result) {
        String cookie = result.getResponse().getHeader("Set-Cookie");
        assertNotNull(cookie); assertTrue(cookie.contains("Max-Age=0")); assertTrue(cookie.contains("Path=/auth"));
        assertTrue(cookie.contains("HttpOnly")); assertTrue(cookie.contains("Secure")); assertFalse(cookie.contains("Domain="));
    }
    private void assertLegacy(JsonNode body) {
        assertTrue(legacy.validateToken(body.get("accessToken").asText()));
        var claims = Jwts.parser().verifyWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(LEGACY_KEY.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .build().parseSignedClaims(body.get("accessToken").asText()).getPayload();
        assertEquals(86400, Duration.between(claims.getIssuedAt().toInstant(), claims.getExpiration().toInstant()).getSeconds());
        assertFalse(body.has("refreshToken")); assertFalse(body.has("sessionId")); assertFalse(body.has("expiresIn"));
        assertEquals(body.get("email").asText(), claims.getSubject());
        assertEquals(java.util.Set.of("accessToken", "tokenType", "userId", "email", "userType", "name"),
                mapper.convertValue(body, Map.class).keySet());
    }
    private long countSessions() { return query("MATCH (s:AuthSession) RETURN count(s) AS count", Map.of()).getFirst().get("count").asLong(); }
    private List<org.neo4j.driver.Record> query(String statement, Map<String, Object> values) {
        try (var session = driver.session()) { return session.executeWrite(tx -> tx.run(statement, values).list()); }
    }

    @RestController static class ProtectedEndpoint {
        @GetMapping("/auth-transport-test/protected") String current(@AuthenticationPrincipal CustomUserDetails principal) { return principal.getId(); }
    }

    @Configuration
    @EnableWebMvc
    @EnableAspectJAutoProxy(proxyTargetClass = true)
    @EnableTransactionManagement
    @EnableNeo4jRepositories(basePackages = "com.mint.repositories", includeFilters = @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE, classes = {MusicianRepository.class, VenueRepository.class, PromoterRepository.class}))
    @Import({AuthController.class, AuthService.class, AuthSessionService.class, AuthSessionRepository.class,
            RefreshCredentialGenerator.class, SessionAccessTokenService.class, CustomUserDetailsService.class,
            AuthSessionHttpConfig.class, RefreshCookie.class, AuthHttpExceptionHandler.class, GlobalExceptionHandler.class,
            ApplicationLoggingAspect.class,
            SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class, JwtTokenProvider.class, ProtectedEndpoint.class})
    static class TestConfig extends AbstractNeo4jConfig {
        @Bean(destroyMethod = "close") Neo4j embeddedNeo4j() {
            return Neo4jBuilders.newInProcessBuilder().withDisabledServer()
                    .withConfig(org.neo4j.configuration.GraphDatabaseSettings.pagecache_memory, 64L * 1024 * 1024).build();
        }
        @Override @Bean(destroyMethod = "close") public Driver driver() { return GraphDatabase.driver(embeddedNeo4j().boltURI(), AuthTokens.none()); }
        @Override protected Collection<String> getMappingBasePackages() { return List.of("com.mint.nodes", "com.mint.relationships"); }
        @Bean ObjectMapper objectMapper() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean MutableClock authSessionClock() { return new MutableClock(); }
        @Bean AuthSessionProperties authSessionProperties() { return SessionTestSupport.properties(); }
        @Bean SessionJwtTokenProvider sessionJwtTokenProvider(AuthSessionProperties properties, MutableClock clock) {
            return new SessionJwtTokenProvider(Jwts.SIG.HS512.key().build(), properties, clock);
        }
    }
}
