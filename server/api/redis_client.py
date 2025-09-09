# redis_client.py
from __future__ import annotations
from typing import Optional
import asyncio
import uuid
from redis.asyncio import Redis

_RELEASE_LUA = b"""
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
"""


class RedisClient:
    def __init__(self,
                 host: str, port: int, db: int,
                 decode_responses: bool = False,
                 ssl_enable: bool = False,
                 ssl_certfile: Optional[str] = None,
                 ssl_keyfile: Optional[str] = None,
                 ssl_ca_certs: Optional[str] = None,
                 lock_prefix: str = "LOCK"):
        self._host = host
        self._port = port
        self._db = db
        self._decode = decode_responses
        self._ssl = ssl_enable
        self._ssl_certfile = ssl_certfile
        self._ssl_keyfile = ssl_keyfile
        self._ssl_ca_certs = ssl_ca_certs
        self._client: Optional[Redis] = None
        self.lock_prefix = lock_prefix

    async def connect(self) -> Redis:
        if self._client is None:
            self._client = Redis(
                host=self._host,
                port=self._port,
                db=self._db,
                ssl=self._ssl,
                ssl_certfile=self._ssl_certfile,
                ssl_keyfile=self._ssl_keyfile,
                ssl_ca_certs=self._ssl_ca_certs
            )
        return self._client

    @property
    def client(self) -> Redis:
        if self._client is None:
            raise RuntimeError(
                "RedisClient not connected. Call connect() first.")
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Optional[bytes | str]:
        return await self.client.get(key)

    async def set(self, key: str, value: bytes | str) -> bool:
        return await self.client.set(key, value)

    async def setex(self, key: str, ttl: int, value: bytes | str) -> bool:
        return await self.client.setex(key, ttl, value)

    async def delete(self, key: str) -> int:
        return await self.client.delete(key)

    async def ping(self) -> bool:
        return await self.client.ping()

    async def acquire_lock(self, key: str, ttl: int = 10,
                           retry_count: int = 3,
                           retry_interval: float = 0.05):
        lock_key = f"{self.lock_prefix}{key}"
        val = uuid.uuid4().hex
        count = 0
        sleep = min(retry_interval, 0.2)
        while True:
            ok = await self.client.set(lock_key, val, nx=True, ex=max(1, ttl))
            if ok:
                return True, val
            if count >= retry_count:
                return False, ""
            await asyncio.sleep(sleep)
            count += 1

    async def release_lock(self, key: str, val: str) -> bool:
        lock_key = f"{self.lock_prefix}{key}"
        try:
            res = await self.client.eval(_RELEASE_LUA, 1, lock_key, val)
            return res == 1
        except Exception:
            return False
