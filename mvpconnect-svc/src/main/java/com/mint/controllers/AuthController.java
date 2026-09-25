package com.mint.controllers;

import com.mint.authsession.*;
import com.mint.authsession.http.AuthClientTransportResolver;
import com.mint.authsession.http.AuthHttpException;
import com.mint.authsession.http.RefreshCookie;
import com.mint.dto.request.*;
import com.mint.dto.response.*;
import com.mint.security.SessionAccessTokenService;
import com.mint.services.AuthService;
import com.mint.services.AuthSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Application login sessions only; provider OAuth is a separate system. */
@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService auth;
    private final AuthSessionService sessions;
    private final SessionAccessTokenService access;
    private final AuthClientTransportResolver transports;
    private final RefreshCookie cookies;

    public AuthController(AuthService auth, AuthSessionService sessions, SessionAccessTokenService access,
            AuthClientTransportResolver transports, RefreshCookie cookies) {
        this.auth = auth;
        this.sessions = sessions;
        this.access = access;
        this.transports = transports;
        this.cookies = cookies;
    }

    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() { return ResponseEntity.ok().build(); }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, false);
        if (transport == null) return ResponseEntity.ok(auth.login(body)); // Phase 5 removal.
        return establish(auth.authenticateIdentity(body), transport, HttpStatus.OK);
    }

    @PostMapping("/signup/musician")
    public ResponseEntity<?> signupMusician(@Valid @RequestBody MusicianSignupRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, false);
        if (transport == null) return ResponseEntity.status(HttpStatus.CREATED).body(auth.signupMusician(body));
        return establish(auth.createMusician(body), transport, HttpStatus.CREATED);
    }

    @PostMapping("/signup/venue")
    public ResponseEntity<?> signupVenue(@Valid @RequestBody VenueSignupRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, false);
        if (transport == null) return ResponseEntity.status(HttpStatus.CREATED).body(auth.signupVenue(body));
        return establish(auth.createVenue(body), transport, HttpStatus.CREATED);
    }

    @PostMapping("/signup/promoter")
    public ResponseEntity<?> signupPromoter(@Valid @RequestBody PromoterSignupRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, false);
        if (transport == null) return ResponseEntity.status(HttpStatus.CREATED).body(auth.signupPromoter(body));
        return establish(auth.createPromoter(body), transport, HttpStatus.CREATED);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody(required = false) RefreshTokenRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, true);
        SessionResult result = sessions.rotateRefreshCredential(credential(request, body, transport), transport);
        if (!result.succeeded()) throw new SessionAuthException(result.failure());
        // The driver transaction has committed before access issuance or credential delivery.
        SessionAccessResponse token = access.issueAccessResponse(result.session().id());
        var response = uncached(HttpStatus.OK);
        if (transport == SessionTransport.WEB) {
            return response.header(HttpHeaders.SET_COOKIE, cookies.setRefreshCookie(
                    result.refreshCredential().reveal(), result.session()).toString()).body(token);
        }
        return response.body(new NativeRefreshResponse(token, result.refreshCredential().reveal()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) RefreshTokenRequest body, HttpServletRequest request) {
        SessionTransport transport = transports.resolve(request, true);
        AuthFailure failure = sessions.revokeRefreshSession(credential(request, body, transport), transport);
        if (failure == AuthFailure.TRANSPORT_MISMATCH) throw new SessionAuthException(failure);
        var response = uncached(HttpStatus.NO_CONTENT);
        if (transport == SessionTransport.WEB) response.header(HttpHeaders.SET_COOKIE, cookies.clearRefreshCookie().toString());
        return response.build();
    }

    private ResponseEntity<?> establish(AuthIdentity identity, SessionTransport transport, HttpStatus status) {
        SessionResult result = sessions.createSession(identity.userId(), identity.persona(), transport, null);
        if (!result.succeeded()) throw new SessionAuthException(result.failure());
        SessionAccessResponse token = access.issueAccessResponse(result.session().id());
        var response = uncached(status);
        if (transport == SessionTransport.WEB) {
            return response.header(HttpHeaders.SET_COOKIE, cookies.setRefreshCookie(
                    result.refreshCredential().reveal(), result.session()).toString()).body(new WebSessionResponse(token, identity));
        }
        return response.body(new NativeSessionResponse(token, identity, result.refreshCredential().reveal()));
    }

    private String credential(HttpServletRequest request, RefreshTokenRequest body, SessionTransport transport) {
        if (transport == SessionTransport.WEB) {
            if (body != null && body.supplied()) throw new AuthHttpException(AuthHttpException.Code.AUTH_REQUEST_INVALID);
            return cookies.read(request);
        }
        return body == null ? null : body.credential();
    }

    private ResponseEntity.BodyBuilder uncached(HttpStatus status) {
        return ResponseEntity.status(status).header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.PRAGMA, "no-cache");
    }
}
