package com.mint.authsession.http;

import com.mint.authsession.SessionTransport;
import com.mint.config.AuthSessionHttpProperties;
import com.mint.config.CorsProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;

import java.util.Collections;
import java.util.List;
import java.util.Locale;

import static com.mint.authsession.http.AuthHttpException.Code.*;

/** Browser-controlled Origin/Fetch Metadata are transport guards, never identity credentials. */
public class AuthClientTransportResolver {
    public static final String HEADER = "X-MVP-Client";
    public static final String ATTRIBUTE = AuthClientTransportResolver.class.getName() + ".transport";
    private final AuthSessionHttpProperties properties;
    private final List<String> trustedOrigins;

    public AuthClientTransportResolver(AuthSessionHttpProperties properties, CorsProperties cors) {
        this.properties = properties;
        this.trustedOrigins = List.copyOf(cors.getAllowedOrigins());
    }

    /** null means transitional legacy login/signup only. */
    public SessionTransport resolve(HttpServletRequest request, boolean required) {
        var values = Collections.list(request.getHeaders(HEADER));
        if (values.isEmpty() && !required) return null;
        if (values.size() != 1) throw new AuthHttpException(AUTH_TRANSPORT_INVALID);
        SessionTransport transport = switch (values.getFirst().trim().toLowerCase(Locale.ROOT)) {
            case "web" -> SessionTransport.WEB;
            case "native" -> SessionTransport.NATIVE;
            default -> throw new AuthHttpException(AUTH_TRANSPORT_INVALID);
        };
        if (transport == SessionTransport.WEB) {
            var origins = Collections.list(request.getHeaders("Origin"));
            if (origins.size() != 1 || !trustedOrigins.contains(origins.getFirst())) {
                throw new AuthHttpException(AUTH_ORIGIN_FORBIDDEN);
            }
        } else {
            // Browsers cannot suppress/forge Origin or Sec-Fetch-* on these custom-header POSTs.
            // Reject even Origin:null, blank headers, and same-origin browser context.
            if (request.getHeader("Origin") != null || Collections.list(request.getHeaderNames()).stream()
                    .anyMatch(name -> name.toLowerCase(Locale.ROOT).startsWith("sec-fetch-"))) {
                throw new AuthHttpException(AUTH_ORIGIN_FORBIDDEN);
            }
            if (request.getCookies() != null) {
                for (var cookie : request.getCookies()) {
                    if (cookie.getName().equals(properties.getCookieName())) {
                        throw new AuthHttpException(AUTH_TRANSPORT_INVALID);
                    }
                }
            }
        }
        if (request.getContentType() != null || request.getContentLengthLong() > 0
                || request.getHeader("Transfer-Encoding") != null) {
            try {
                var contentType = MediaType.parseMediaType(request.getContentType());
                if (!"application".equals(contentType.getType()) || !"json".equals(contentType.getSubtype())) {
                    throw new IllegalArgumentException();
                }
            } catch (IllegalArgumentException invalid) {
                throw new AuthHttpException(AUTH_REQUEST_INVALID);
            }
        }
        request.setAttribute(ATTRIBUTE, transport);
        return transport;
    }
}
