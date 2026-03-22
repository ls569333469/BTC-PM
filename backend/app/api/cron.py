"""
Cron/scheduler management API routes — full APScheduler integration.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import get_db

router = APIRouter(prefix="/api/cron", tags=["cron"])

# APScheduler instance will be set by main.py on startup
_scheduler = None


def set_scheduler(scheduler):
    global _scheduler
    _scheduler = scheduler


@router.get("/")
async def list_jobs():
    """List all scheduled jobs."""
    if _scheduler is None:
        return {"jobs": [], "status": "scheduler_not_initialized"}

    jobs = _scheduler.get_jobs()
    return {
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            }
            for job in jobs
        ],
        "status": "running" if _scheduler.running else "stopped",
    }


@router.post("/{job_id}/run")
async def run_job(job_id: str):
    """Manually trigger a job."""
    if _scheduler is None:
        return {"error": "Scheduler not initialized"}

    job = _scheduler.get_job(job_id)
    if not job:
        return {"error": f"Job {job_id} not found"}

    job.modify(next_run_time=datetime.now(timezone.utc))  # Run immediately
    return {"status": "triggered", "job_id": job_id}


@router.post("/resolve")
async def manual_resolve(db: AsyncSession = Depends(get_db)):
    """Manually trigger prediction resolution."""
    from app.services.backtest_service import BacktestService
    service = BacktestService()
    result = await service.resolve_predictions(db)
    return result
