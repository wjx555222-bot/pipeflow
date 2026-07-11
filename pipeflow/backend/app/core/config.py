from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./pipeflow.db"
    secret_key: str = "pipeflow-secret-key-change-in-production"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    redis_url: str = "redis://localhost:6379/0"
    max_workers: int = 4
    websocket_ping_interval: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
