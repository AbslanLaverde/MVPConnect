package com.mint.authsession;

import com.mint.onboarding.PersonaType;

public record AuthIdentity(String userId, PersonaType persona, String email, String name) { }
