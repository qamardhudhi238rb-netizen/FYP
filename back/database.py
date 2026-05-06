from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "emovision"
    secret_key: str = "change-this-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_db():
    settings = get_settings()
    db_instance.client = AsyncIOMotorClient(settings.mongodb_url)
    db_instance.db = db_instance.client[settings.database_name]
    # Indexes
    await db_instance.db.users.create_index("email", unique=True)
    print(f"[DB] Connected to MongoDB: {settings.database_name}")


async def close_db():
    if db_instance.client:
        db_instance.client.close()
        print("[DB] Connection closed.")


def get_db():
    return db_instance.db