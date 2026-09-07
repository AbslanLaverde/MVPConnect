package com.mint.observability;

import org.springframework.http.ResponseEntity;

import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Produces operational result metadata without serializing domain objects or secrets.
 */
final class LogResultSummary {

    private LogResultSummary() {
    }

    static String summarize(Object result) {
        if (result == null) return "resultType=void";
        if (result instanceof ResponseEntity<?> response) {
            return "resultType=ResponseEntity status=" + response.getStatusCode().value()
                    + " body={" + summarize(response.getBody()) + "}";
        }
        if (result instanceof Optional<?> optional) {
            return "resultType=Optional present=" + optional.isPresent()
                    + optional.map(value -> " valueType=" + safeType(value)).orElse("");
        }
        if (result instanceof Collection<?> collection) {
            return "resultType=" + safeType(result) + " count=" + collection.size();
        }
        if (result instanceof Map<?, ?> map) {
            return "resultType=" + safeType(result) + " entryCount=" + map.size();
        }
        if (result.getClass().isArray()) {
            return "resultType=" + safeType(result) + " count=" + Array.getLength(result);
        }
        if (result instanceof Boolean booleanResult) {
            return "resultType=Boolean value=" + booleanResult;
        }
        return "resultType=" + safeType(result);
    }

    private static String safeType(Object value) {
        Class<?> type = value.getClass();
        if (type.isArray()) return type.getComponentType().getSimpleName() + "[]";
        return type.getSimpleName();
    }
}
