package com.mint.security;

import com.mint.config.TokenEncryptionProperties;
import com.mint.exceptions.ExternalConnectionException;
import org.springframework.stereotype.Service;

import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class TokenEncryptionService {

    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final TokenEncryptionProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public TokenEncryptionService(TokenEncryptionProperties properties) {
        this.properties = properties;
    }

    public String encrypt(String plaintext, String associatedData) {
        if (plaintext == null) return null;
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            secureRandom.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            return properties.getKeyVersion() + "." + encoder.encodeToString(nonce)
                    + "." + encoder.encodeToString(ciphertext);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw ExternalConnectionException.encryptionFailed();
        }
    }

    public String decrypt(String encoded, String associatedData) {
        if (encoded == null) return null;
        try {
            String[] parts = encoded.split("\\.", -1);
            if (parts.length != 3 || Integer.parseInt(parts[0]) != properties.getKeyVersion()) {
                throw ExternalConnectionException.encryptionFailed();
            }
            Base64.Decoder decoder = Base64.getUrlDecoder();
            byte[] nonce = decoder.decode(parts[1]);
            if (nonce.length != NONCE_BYTES) throw ExternalConnectionException.encryptionFailed();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(decoder.decode(parts[2])), StandardCharsets.UTF_8);
        } catch (AEADBadTagException exception) {
            throw ExternalConnectionException.encryptionFailed();
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw ExternalConnectionException.encryptionFailed();
        }
    }

    private SecretKeySpec key() {
        String configured = properties.getKeyBase64();
        if (configured == null || configured.isBlank()) {
            throw ExternalConnectionException.encryptionUnavailable();
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(configured.trim());
            if (decoded.length != 32) throw ExternalConnectionException.encryptionUnavailable();
            return new SecretKeySpec(decoded, "AES");
        } catch (IllegalArgumentException exception) {
            throw ExternalConnectionException.encryptionUnavailable();
        }
    }
}
