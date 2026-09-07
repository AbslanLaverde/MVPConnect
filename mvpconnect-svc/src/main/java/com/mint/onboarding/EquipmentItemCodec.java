package com.mint.onboarding;

import com.mint.dto.onboarding.shared.EquipmentItemDto;
import com.mint.onboarding.taxonomy.EquipmentCode;

import java.util.ArrayList;
import java.util.List;

/**
 * Maps the public equipment item contract to the compact Neo4j string-list representation.
 * A bare code is the legacy/unspecified-quantity form; a colon suffix contains a quantity.
 */
public final class EquipmentItemCodec {

    private static final String QUANTITY_SEPARATOR = ":";

    private EquipmentItemCodec() {
    }

    public static List<String> encode(List<EquipmentItemDto> equipment) {
        if (equipment == null || equipment.isEmpty()) return List.of();
        return equipment.stream()
                .map(EquipmentItemCodec::encode)
                .toList();
    }

    public static List<EquipmentItemDto> decode(List<String> storedEquipment) {
        if (storedEquipment == null || storedEquipment.isEmpty()) return List.of();
        List<EquipmentItemDto> decoded = new ArrayList<>(storedEquipment.size());
        for (String storedValue : storedEquipment) {
            EquipmentItemDto item = decode(storedValue);
            if (item != null) decoded.add(item);
        }
        return List.copyOf(decoded);
    }

    private static String encode(EquipmentItemDto item) {
        String code = item.code().name();
        return item.quantity() == null
                ? code
                : code + QUANTITY_SEPARATOR + item.quantity();
    }

    private static EquipmentItemDto decode(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) return null;
        String[] parts = storedValue.strip().split(QUANTITY_SEPARATOR, -1);
        if (parts.length > 2) return null;
        try {
            EquipmentCode code = EquipmentCode.valueOf(parts[0]);
            Integer quantity = parts.length == 1 ? null : Integer.valueOf(parts[1]);
            if (quantity != null && (quantity < 1 || quantity > 99)) return null;
            return new EquipmentItemDto(code, quantity);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
