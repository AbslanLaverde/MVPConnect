package com.mint.controllers;

import com.mint.dto.response.account.SelfAccountResponse;
import com.mint.services.SelfAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SelfAccountController {

    private final SelfAccountService selfAccountService;

    public SelfAccountController(SelfAccountService selfAccountService) {
        this.selfAccountService = selfAccountService;
    }

    @GetMapping("/me")
    public ResponseEntity<SelfAccountResponse> getCurrentAccount() {
        return ResponseEntity.ok(selfAccountService.getCurrentAccount());
    }
}
