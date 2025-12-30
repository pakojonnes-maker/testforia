/**
 * workerCrypto.js
 * Correct Implementation of Web Push Encryption (RFC 8291 / aes128gcm)
 */

export class WebPushCrypto {

    static async encrypt(subscription, payload) {
        if (!subscription || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
            throw new Error("Invalid subscription keys");
        }

        const plainText = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const encoder = new TextEncoder();

        // 1. Decode User Keys
        const uaPublic = this.base64ToBuffer(subscription.keys.p256dh);
        const uaAuth = this.base64ToBuffer(subscription.keys.auth);

        // 2. Generate Local Ephemeral Key Pair (AS Public/Private)
        const localKeyPair = await crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveBits"]
        );
        const asPublic = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

        // 3. Derive Shared Secret (ECDH)
        const uaPublicImported = await crypto.subtle.importKey(
            "raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []
        );

        const sharedSecret = await crypto.subtle.deriveBits(
            { name: "ECDH", public: uaPublicImported },
            localKeyPair.privateKey,
            256
        );

        // 4. Derive Pseudo-Random Key (PRK) for the key schedule
        // RFC 8291: PRK_key = HKDF-Extract(salt=auth_secret, IKM=shared_secret)
        const prkKey = await this.hkdfExtract(uaAuth, sharedSecret);

        // 5. Derive Content Encryption Key (CEK) and Nonce
        // RFC 8291: IKM = HKDF-Expand(PRK_key, key_info, 32)
        // key_info = "WebPush: info" || 0x00 || ua_public || as_public
        const keyInfo = this.createInfo("WebPush: info", uaPublic, asPublic);
        const ikm = await this.hkdfExpand(prkKey, keyInfo, 32);

        // 6. Generate Message Salt
        const salt = crypto.getRandomValues(new Uint8Array(16));

        // 7. Derive Actual Encryption Keys
        // RFC 8291: PRK = HKDF-Extract(salt=salt, IKM=ikm)
        const prk = await this.hkdfExtract(salt, ikm);

        // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm" || 0x00, 16)
        const cekInfo = this.createTextInfo("Content-Encoding: aes128gcm");
        const cek = await this.hkdfExpand(prk, cekInfo, 16);

        // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce" || 0x00, 12)
        const nonceInfo = this.createTextInfo("Content-Encoding: nonce");
        const nonce = await this.hkdfExpand(prk, nonceInfo, 12);

        // 8. Encrypt (AES-128-GCM)
        // Padding: 0x00 || 0x00 (2 bytes) + plainText
        // RFC 8188 says padding delimiter 0x01 or 0x02... 
        // Web Push (aes128gcm) simply appends padding.
        // The record format is usually just the cyphertext of (padding + data).
        // Standard is: a single record ending with 0x02 (if last) or 0x01 (if not).
        // BUT Web Push uses 0x02 (last record) usually implicitly?
        // Actually, simple implementation: just add \0 padding if needed. 
        // Let's use 0 padding + standard encoding.
        // Correct is: data + padding. 
        // Let's stick to minimal: data + 1 byte (0x02) to indicate end of record?
        // No, simplest is: valid JSON + standard GCM tag (handled by subtle.encrypt).
        // Wait, RFC 8188 payload structure:
        // Plaintext = (Data || 0x02) for the last record.
        const inputBuffer = encoder.encode(plainText);
        const record = new Uint8Array(inputBuffer.length + 1);
        record.set(inputBuffer, 0);
        record[inputBuffer.length] = 0x02; // delimiter for last record

        const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce, tagLength: 128 },
            aesKey,
            record
        );

        return {
            body: ciphertext,
            salt: salt, // Raw Uint8Array
            localPublicKey: asPublic // Raw ArrayBuffer
        };
    }

    // --- Helpers ---

    static async hkdfExtract(salt, ikm) {
        // HKDF-Extract(salt, IKM) -> HMAC-SHA256(salt, IKM)
        // Note: importKey("raw", salt) treats salt as key.
        const key = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        return await crypto.subtle.sign("HMAC", key, ikm);
    }

    static async hkdfExpand(prk, info, length) {
        // RFC 5869: HKDF-Expand(PRK, info, L)
        // Manual implementation using HMAC-SHA256 to ONLY perform Expand step
        // (Web Crypto's HKDF algorithm always runs Extract+Expand together)

        const hashLen = 32; // SHA-256 output length
        const n = Math.ceil(length / hashLen);
        const okm = new Uint8Array(n * hashLen);

        const key = await crypto.subtle.importKey(
            "raw",
            prk,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        let previousT = new Uint8Array(0);
        const infoBuf = new Uint8Array(info);

        for (let i = 1; i <= n; i++) {
            // T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
            const input = new Uint8Array(previousT.length + infoBuf.length + 1);
            input.set(previousT, 0);
            input.set(infoBuf, previousT.length);
            input[input.length - 1] = i;

            const t = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
            okm.set(t, (i - 1) * hashLen);
            previousT = t;
        }

        // Return only the requested length
        return okm.slice(0, length).buffer;
    }

    static createInfo(type, uaPub, asPub) {
        const encoder = new TextEncoder();
        const typeBuf = encoder.encode(type + "\0");
        const len = typeBuf.length + uaPub.byteLength + asPub.byteLength;
        const out = new Uint8Array(len);
        let offset = 0;
        out.set(typeBuf, offset); offset += typeBuf.length;
        out.set(new Uint8Array(uaPub), offset); offset += uaPub.byteLength;
        out.set(new Uint8Array(asPub), offset);
        return out;
    }

    static createTextInfo(text) {
        return new TextEncoder().encode(text + "\0");
    }

    static base64ToBuffer(b64url) {
        const padding = '='.repeat((4 - b64url.length % 4) % 4);
        const base64 = (b64url + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    static bufferToBase64Url(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}
