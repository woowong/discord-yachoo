# discord-signature-verifier Specification

## Purpose
디스코드 서버에서 보내오는 웹훅 요청이 신뢰할 수 있는 소스로부터 온 것인지 확인하기 위해 Ed25519 서명 값을 암호학적으로 확인하고 유효성을 검증합니다.

## Requirements

### Requirement: Ed25519 Webhook Verification
The system SHALL verify incoming HTTP POST request signatures using the `X-Signature-Ed25519` and `X-Signature-Timestamp` headers and the bot's configured public key.

#### Scenario: Verify valid signature
- **WHEN** the request signature matches the public key, timestamp, and body
- **THEN** verification SHALL succeed and return true.

#### Scenario: Verify invalid signature
- **WHEN** the signature header does not match the computed signature for the timestamp and body
- **THEN** verification SHALL fail and return false.

#### Scenario: Missing verification headers
- **WHEN** the `X-Signature-Ed25519` or `X-Signature-Timestamp` header is absent
- **THEN** verification SHALL fail and return false.
