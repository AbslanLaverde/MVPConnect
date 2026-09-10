package com.mint.services;

import com.mint.nodes.MediaAsset;
import com.mint.repositories.MediaAssetRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaCleanupServiceTest {

    @Mock private MediaAssetRepository repository;

    @Test
    void plansBoundedStaleCandidatesWithoutDeletingAnything() {
        MediaAsset candidate = new MediaAsset();
        candidate.setId("media-1");
        when(repository.findCleanupCandidates(org.mockito.ArgumentMatchers.any(), eq(1_000L)))
                .thenReturn(List.of(candidate));
        MediaCleanupService service = new MediaCleanupService(repository);

        LocalDateTime before = LocalDateTime.now().minusHours(24).minusSeconds(1);
        List<MediaAsset> result = service.findStaleCandidates(Duration.ofHours(24), 5_000);
        LocalDateTime after = LocalDateTime.now().minusHours(24).plusSeconds(1);

        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repository).findCleanupCandidates(cutoff.capture(), eq(1_000L));
        org.junit.jupiter.api.Assertions.assertTrue(cutoff.getValue().isAfter(before));
        org.junit.jupiter.api.Assertions.assertTrue(cutoff.getValue().isBefore(after));
        assertEquals(List.of(candidate), result);
    }

    @Test
    void rejectsUnsafePlanningArguments() {
        MediaCleanupService service = new MediaCleanupService(repository);

        assertThrows(IllegalArgumentException.class,
                () -> service.findStaleCandidates(Duration.ZERO, 10));
        assertThrows(IllegalArgumentException.class,
                () -> service.findStaleCandidates(Duration.ofHours(1), 0));
    }
}
