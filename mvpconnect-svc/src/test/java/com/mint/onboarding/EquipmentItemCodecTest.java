package com.mint.onboarding;

import com.mint.dto.onboarding.shared.EquipmentItemDto;
import com.mint.onboarding.taxonomy.EquipmentCode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EquipmentItemCodecTest {

    @Test
    void canonicalEncodingPreservesCodeQuantityNullAndOrder() {
        List<EquipmentItemDto> equipment = List.of(
                new EquipmentItemDto(EquipmentCode.GUITAR_AMP, 2),
                new EquipmentItemDto(EquipmentCode.MICROPHONES, 4),
                new EquipmentItemDto(EquipmentCode.DRUM_KIT, null));

        List<String> stored = EquipmentItemCodec.encode(equipment);

        assertEquals(List.of("GUITAR_AMP:2", "MICROPHONES:4", "DRUM_KIT"), stored);
        assertEquals(equipment, EquipmentItemCodec.decode(stored));
    }

    @Test
    void legacyStringOnlyEquipmentDecodesWithUnspecifiedQuantities() {
        assertEquals(List.of(
                        new EquipmentItemDto(EquipmentCode.MICROPHONES, null),
                        new EquipmentItemDto(EquipmentCode.GUITAR_AMP, null)),
                EquipmentItemCodec.decode(List.of("MICROPHONES", "GUITAR_AMP")));
    }
}
