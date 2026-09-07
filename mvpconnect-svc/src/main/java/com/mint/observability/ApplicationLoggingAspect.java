package com.mint.observability;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Consistent DEBUG lifecycle logging for application boundaries. Arguments and raw
 * return values are never logged; repository results are summarized by shape/count.
 */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class ApplicationLoggingAspect {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationLoggingAspect.class);

    private final long slowOperationThresholdMs;

    public ApplicationLoggingAspect(
            @Value("${observability.logging.slow-operation-threshold-ms:1000}")
            long slowOperationThresholdMs) {
        this.slowOperationThresholdMs = Math.max(1, slowOperationThresholdMs);
    }

    @Around("@within(org.springframework.web.bind.annotation.RestController)")
    public Object logController(ProceedingJoinPoint joinPoint) throws Throwable {
        return logOperation(joinPoint, "controller");
    }

    @Around("@within(org.springframework.stereotype.Service)")
    public Object logService(ProceedingJoinPoint joinPoint) throws Throwable {
        return logOperation(joinPoint, "service");
    }

    @Around("this(org.springframework.data.repository.Repository)")
    public Object logRepository(ProceedingJoinPoint joinPoint) throws Throwable {
        return logOperation(joinPoint, "repository");
    }

    private Object logOperation(ProceedingJoinPoint joinPoint, String layer) throws Throwable {
        String operation = operation(joinPoint);
        long startedAt = System.nanoTime();
        LOGGER.debug("app.operation.started layer={} operation={}", layer, operation);
        try {
            Object result = joinPoint.proceed();
            long durationMs = elapsedMs(startedAt);
            String summary = LogResultSummary.summarize(result);
            LOGGER.debug(
                    "app.operation.completed layer={} operation={} durationMs={} {}",
                    layer, operation, durationMs, summary
            );
            if (durationMs >= slowOperationThresholdMs) {
                LOGGER.warn(
                        "app.operation.slow layer={} operation={} durationMs={} thresholdMs={}",
                        layer, operation, durationMs, slowOperationThresholdMs
                );
            }
            return result;
        } catch (Throwable exception) {
            long durationMs = elapsedMs(startedAt);
            if ("repository".equals(layer)) {
                LOGGER.error(
                        "database.operation.failed operation={} durationMs={} exception={}",
                        operation, durationMs, exception.getClass().getSimpleName()
                );
            } else {
                LOGGER.debug(
                        "app.operation.failed layer={} operation={} durationMs={} exception={}",
                        layer, operation, durationMs, exception.getClass().getSimpleName()
                );
            }
            throw exception;
        }
    }

    private String operation(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        return signature.getDeclaringType().getSimpleName() + "." + signature.getName();
    }

    private long elapsedMs(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }
}
