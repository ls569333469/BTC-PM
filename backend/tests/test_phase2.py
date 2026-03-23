"""Full integration test of Phase 2B/2C/2D changes"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from app.services.chanlun_service import ChanlunService

async def main():
    svc = ChanlunService()
    r = await svc.full_analysis()
    p = r['predictions'][0]
    
    print("=== Phase 2 Integration Test ===")
    print(f"引擎: {p.get('engineUsed')}")
    print()
    
    print("--- 3个独立评分 ---")
    print(f"缠论评分: {p.get('chanlunWinRate')}/100 方向: {p.get('chanlunDirection')}")
    print(f"因子评分: {p.get('factorWinRate')}/100 方向: {p.get('factorDirection')}")
    print(f"综合评分: {p.get('compositeWinRate')}/100 方向: {p.get('compositeDirection')}")
    print()
    
    print("--- 6因子详情 ---")
    for f in p.get('factorScores', []):
        print(f"  {f['factor']:18s} score={f['score']:+.1f} dir={f['direction']:7s} | {f['detail']}")
    print()
    
    print("--- 方向一致性 ---")
    cd = p.get('chanlunDirection', '?')
    fd = p.get('factorDirection', '?')
    if cd == fd:
        print(f"  ✅ 同向: 缠论{cd} + 因子{fd}")
    elif cd == 'sideways' or fd == 'neutral':
        print(f"  ➖ 一方中性: 缠论{cd} + 因子{fd}")
    else:
        print(f"  ❌ 反向: 缠论{cd} vs 因子{fd} → 观望")
    
    cw = p.get('compositeWinRate', 0)
    print(f"  综合评分={cw} {'→ 可操作' if cw >= 60 else '→ 观望'}")

asyncio.run(main())
