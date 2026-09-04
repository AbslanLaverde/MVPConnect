package com.mint.dto.response.account;

public sealed interface SelfAccountResponse permits
        MusicianSelfAccountResponse,
        VenueSelfAccountResponse,
        PromoterSelfAccountResponse {
}
