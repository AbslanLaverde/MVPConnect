package com.mint.security;

import com.mint.onboarding.PersonaType;

public record AuthenticatedPersona(String userId, PersonaType persona) {
}
