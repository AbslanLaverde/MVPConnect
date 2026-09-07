package com.mint.observability;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LogResultSummaryTest {

    @Test
    void summarizesCollectionResponseByStatusAndCount() {
        String summary = LogResultSummary.summarize(ResponseEntity.ok(List.of("one", "two")));

        assertTrue(summary.startsWith("resultType=ResponseEntity status=200 body={"));
        assertTrue(summary.contains("count=2"));
        assertFalse(summary.contains("one"));
        assertFalse(summary.contains("two"));
    }

    @Test
    void summarizesOptionalWithoutSerializingItsValue() {
        String summary = LogResultSummary.summarize(Optional.of("private@example.com"));

        assertEquals("resultType=Optional present=true valueType=String", summary);
        assertFalse(summary.contains("private@example.com"));
    }

    @Test
    void neverLogsStringContents() {
        String summary = LogResultSummary.summarize("Bearer secret-token");

        assertEquals("resultType=String", summary);
        assertFalse(summary.contains("secret-token"));
    }
}
