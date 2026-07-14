For a high-security financial client, use a maintained certificate-pinning solution such as react-native-ssl-pinning and configure the expected certificate or public-key pins for the API. Enforce HTTPS and keep platform network-security configuration aligned with the client library.

Test that a request fails with an untrusted or changed certificate, and monitor pin expiry and rotation. Pinning can brick an old app when certificates rotate, so ship overlapping pins or a planned app update and keep a recovery process. Do not treat pinning as a replacement for backend authentication or authorization.



