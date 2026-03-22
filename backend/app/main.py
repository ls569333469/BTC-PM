"""
BTC Chanlun Analyzer — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.base import init_db
from app.api import chanlun, backtest, polymarket, cron, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    settings = get_settings()
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")

    # Initialize database (graceful if DB not available)
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️  Database not available: {e}")
        print("   Server will start without DB. Configure DATABASE_URL in .env")

    # Start APScheduler
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from app.api.cron import set_scheduler

    scheduler = AsyncIOScheduler()

    # Auto-resolve expired predictions every 5 minutes
    async def auto_resolve():
        try:
            from app.models.base import get_session_factory
            from app.services.backtest_service import BacktestService
            factory = get_session_factory()
            async with factory() as session:
                svc = BacktestService()
                result = await svc.resolve_predictions(session)
                await session.commit()
                if result.get("resolved", 0) > 0:
                    print(f"⏰ Auto-resolved {result['resolved']} predictions")
        except Exception as e:
            print(f"⚠️  Auto-resolve error: {e}")

    scheduler.add_job(auto_resolve, "interval", minutes=5, id="auto_resolve", name="Auto-resolve predictions")

    # Auto-run analysis + save every 15 minutes
    async def auto_analysis():
        try:
            from app.models.base import get_session_factory
            from app.services.chanlun_service import ChanlunService
            from app.services.backtest_service import BacktestService
            from datetime import datetime, timezone

            chanlun = ChanlunService()
            result = await chanlun.full_analysis(symbol="BTC")

            if result.get("predictions"):
                factory = get_session_factory()
                async with factory() as session:
                    bt = BacktestService()
                    save_data = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "predictions": [
                            {
                                "timeframe": p["timeframe"],
                                "direction": p["direction"],
                                "targetPrice": p["targetPrice"],
                                "currentPrice": p["currentPrice"],
                                "winRate": p["winRate"],
                                "weightClass": p.get("weightClass"),
                                "factorScores": p.get("factorScores"),
                            }
                            for p in result["predictions"]
                        ],
                    }
                    saved = await bt.save_predictions(session, save_data)
                    await session.commit()
                    print(f"📊 Auto-analysis: saved {saved.get('saved', 0)} predictions")

            # Broadcast to WebSocket clients
            if ws.manager.active_count > 0:
                await ws.manager.broadcast({
                    "type": "analysis",
                    "data": result,
                    "ts": datetime.now(timezone.utc).timestamp(),
                })
                print(f"📡 Broadcast to {ws.manager.active_count} WS clients")
        except Exception as e:
            print(f"⚠️  Auto-analysis error: {e}")

    scheduler.add_job(
        auto_analysis, "interval",
        minutes=settings.analysis_interval_minutes,
        id="auto_analysis", name="Auto Chanlun analysis + save",
    )

    scheduler.start()
    set_scheduler(scheduler)
    print(f"⏰ Scheduler started ({settings.analysis_interval_minutes}min interval)")

    yield

    scheduler.shutdown()
    print("👋 Shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    # CORS — allow frontend dev server
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check
    @app.get("/api/health")
    async def health():
        return {"status": "ok", "version": settings.app_version}

    # Register routers
    app.include_router(chanlun.router)
    app.include_router(backtest.router)
    app.include_router(polymarket.router)
    app.include_router(cron.router)
    app.include_router(ws.router)

    return app


app = create_app()
