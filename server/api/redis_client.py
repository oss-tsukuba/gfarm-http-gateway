# redis_client.py
from __future__ import annotations
from typing import Optional
from redis.asyncio import Redis


class RedisClient:
    def __init__(self,
                 host: str, port: int, db: int,
                 decode_responses: bool = False,
                 ssl_enable: bool = False,
                 ssl_certfile: Optional[str] = None,
                 ssl_keyfile: Optional[str] = None,
                 ssl_ca_certs: Optional[str] = None):
        self._host = host
        self._port = port
        self._db = db
        self._decode = decode_responses
        self._ssl = ssl_enable
        self._ssl_certfile = ssl_certfile
        self._ssl_keyfile = ssl_keyfile
        self._ssl_ca_certs = ssl_ca_certs
        self._client: Optional[Redis] = None

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

    # Optional convenience proxies (use if you like)
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
