package com.mint.observability;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestLoggingFilterTest {

    private final RequestLoggingFilter filter = new RequestLoggingFilter();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void preservesSafeIncomingRequestIdAndMakesItAvailableDuringRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/onboarding");
        request.addHeader(RequestLoggingFilter.REQUEST_ID_HEADER, "client-request_123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> requestIdDuringChain = new AtomicReference<>();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            requestIdDuringChain.set(MDC.get("requestId"));
            MDC.put("accountId", "account-1");
            MDC.put("persona", "MUSICIAN");
        });

        assertEquals("client-request_123", requestIdDuringChain.get());
        assertEquals("client-request_123", response.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER));
        assertNull(MDC.get("requestId"));
        assertNull(MDC.get("accountId"));
        assertNull(MDC.get("persona"));
    }

    @Test
    void replacesUnsafeIncomingRequestId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");
        request.addHeader(RequestLoggingFilter.REQUEST_ID_HEADER, "unsafe request id\nforged");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> { });

        String generated = response.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER);
        assertNotEquals("unsafe request id\nforged", generated);
        assertTrue(generated.matches("[a-f0-9-]{36}"));
    }
}
