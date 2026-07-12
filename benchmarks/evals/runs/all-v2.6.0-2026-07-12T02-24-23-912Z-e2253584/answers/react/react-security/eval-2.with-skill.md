This is an IDOR vulnerability. The backend must validate ownership or authorization for the requested ID on every request; never rely on frontend validation or URL secrecy for access control.
