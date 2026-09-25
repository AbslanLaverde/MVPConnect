package com.mint.authsession;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.mint.config.GlobalExceptionHandler;
import com.mint.dto.response.JwtAuthenticationResponse;
import com.mint.nodes.RefreshCredential;
import com.mint.security.JwtAuthenticationEntryPoint;
import com.mint.security.JwtTokenProvider;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

class AuthSecretHandlingTest {
    @Test void generatorReturns256BitUrlSafeSecretsAndOnlySha256HashesArePersistable() throws Exception {
        var generator = new RefreshCredentialGenerator();
        var seen = new HashSet<String>();
        for (int i = 0; i < 256; i++) {
            var secret = generator.generate();
            String raw = secret.reveal();
            assertEquals(32, Base64.getUrlDecoder().decode(raw).length);
            assertTrue(raw.matches("[A-Za-z0-9_-]{43}"));
            assertTrue(seen.add(raw));
            String hash = generator.hash(raw);
            assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.US_ASCII))), hash);
            assertTrue(generator.matches(hash, hash));
            assertFalse(generator.matches(hash, generator.hash(generator.generate().reveal())));
            assertFalse(secret.toString().contains(raw));
            assertFalse(new RefreshCredential(hash, SessionTestSupport.START, null).toString().contains(hash));
            assertFalse(SessionResult.success(SessionTestSupport.session(), secret).toString().contains(raw));
        }
        assertFalse(new JwtAuthenticationResponse("private-jwt", "Bearer", "id", "email", "MUSICIAN", "name")
                .toString().contains("private-jwt"));
    }

    @Test void parserLoggingAndPublicAuthErrorsNeverEchoCredentialsOrInternalDetails() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(JwtTokenProvider.class);
        Level previous = logger.getLevel();
        var appender = new ListAppender<ILoggingEvent>();
        appender.start(); logger.addAppender(appender); logger.setLevel(Level.DEBUG);
        try {
            var legacy = new JwtTokenProvider();
            ReflectionTestUtils.setField(legacy, "jwtSecret", Base64.getEncoder()
                    .encodeToString(Jwts.SIG.HS512.key().build().getEncoded()));
            assertFalse(legacy.validateToken("private-token-value"));
            assertFalse(appender.list.isEmpty());
            for (var event : appender.list) {
                assertFalse(event.getFormattedMessage().contains("private-token-value"));
                assertNull(event.getThrowableProxy());
            }
            var response = new MockHttpServletResponse();
            var request = new MockHttpServletRequest("GET", "/me");
            new JwtAuthenticationEntryPoint().commence(request, response,
                    new BadCredentialsException("private-token-value"));
            assertEquals(401, response.getStatus());
            assertFalse(response.getContentAsString().contains("private-token-value"));
            var errors = new GlobalExceptionHandler();
            assertEquals("Authentication failed", errors.handleSessionAuthentication(
                    new SessionAuthException(AuthFailure.REFRESH_REUSED), request).getBody().getMessage());
            assertEquals(503, errors.handleSessionStorage(new SessionStoreException(), request).getStatusCode().value());
        } finally {
            logger.detachAppender(appender); logger.setLevel(previous); appender.stop();
        }
    }
}
