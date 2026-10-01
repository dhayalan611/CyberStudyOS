"""Process-local limiting for abuse-sensitive authentication endpoints."""
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request

from .config import settings


class AuthRateLimiter:
    def __init__(self):
        self._attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def reset(self) -> None:
        with self._lock:
            self._attempts.clear()

    def check(self, request: Request) -> None:
        endpoint = request.url.path.rsplit("/", 1)[-1]
        limit = settings.AUTH_LOGIN_RATE_LIMIT if endpoint == "login" else settings.AUTH_REGISTER_RATE_LIMIT
        window = settings.AUTH_RATE_LIMIT_WINDOW_SECONDS
        # X-Forwarded-For is user-controlled unless a trusted proxy is explicitly
        # configured; use only the direct socket peer in this application layer.
        client_ip = request.client.host if request.client else "unknown"
        key = (endpoint, client_ip)
        now = monotonic()
        with self._lock:
            attempts = self._attempts[key]
            cutoff = now - window
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            if len(attempts) >= limit:
                retry_after = max(1, int(attempts[0] + window - now + 0.999))
                raise HTTPException(
                    status_code=429,
                    detail="Too many authentication attempts. Please wait before trying again.",
                    headers={"Retry-After": str(retry_after)},
                )
            attempts.append(now)


auth_rate_limiter = AuthRateLimiter()


def check_auth_rate_limit(request: Request) -> None:
    auth_rate_limiter.check(request)
