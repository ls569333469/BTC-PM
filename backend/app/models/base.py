"""
SQLAlchemy async engine and session setup.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Lazy-initialized engine and session
_engine = None
_async_session = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory():
    global _async_session
    if _async_session is None:
        _async_session = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields a database session."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables on startup + migrate new columns."""
    from app.models.prediction import PredictionRecord  # noqa: F401
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Migrate: add new columns for 3-track backtest (Phase 3)
    new_columns = [
        ("chanlun_win_rate", "INTEGER"),
        ("chanlun_direction", "VARCHAR"),
        ("factor_win_rate", "INTEGER"),
        ("factor_direction", "VARCHAR"),
        ("composite_win_rate", "INTEGER"),
        ("composite_direction", "VARCHAR"),
        ("factor_direction_correct", "BOOLEAN"),
        ("composite_action_correct", "BOOLEAN"),
    ]
    async with engine.begin() as conn:
        for col_name, col_type in new_columns:
            try:
                await conn.execute(
                    __import__("sqlalchemy").text(
                        f"ALTER TABLE prediction_records ADD COLUMN {col_name} {col_type}"
                    )
                )
            except Exception:
                pass  # Column already exists
