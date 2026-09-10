package com.mint.repositories;

import com.mint.nodes.MediaAsset;

/** Projection of canonical media and its relationship-owned gallery position. */
public record CanonicalMediaEntry(MediaAsset media, Integer relationshipSortOrder) {
}
