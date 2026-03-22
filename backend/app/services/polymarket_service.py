"""
Polymarket Service — BTC prediction market data with slug-based lookup.
Port from polymarket-prices.js (521 lines) to Python.
"""

import asyncio
import httpx
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from app.clients.polymarket_client import get_polymarket_client

logger = logging.getLogger(__name__)

MONTH_NAMES = [
    "", "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

TIMEFRAME_LABELS = {
    "5M": "5 分钟", "15M": "15 分钟", "1H": "1 小时", "4H": "4 小时",
    "Daily": "日线", "Weekly": "周线",
}


class PolymarketService:
    """Handles Polymarket BTC market data across multiple timeframes."""

    def __init__(self):
        self.client = get_polymarket_client()

    async def get_prices(self) -> dict:
        """
        Fetch multi-timeframe Polymarket BTC contracts.
        Port of GET /api/polymarket-prices/prices.
        """
        et = _get_et_now()
        timeframes = []

        # Fetch all timeframes in parallel
        tasks = {
            "5M": self._fetch_5m(et),
            "15M": self._fetch_15m(et),
            "1H": self._fetch_1h(et),
            "4H": self._fetch_4h(et),
            "Daily": self._fetch_daily(et),
            "Weekly": self._fetch_weekly(et),
        }

        results = {}
        for name, coro in tasks.items():
            try:
                results[name] = await coro
                logger.info(f"[PM DEBUG] {name} -> {results[name] is not None}")
            except Exception as exc:
                logger.error(f"[PM DEBUG] {name} EXCEPTION: {exc}")
                results[name] = None

        order = 0
        for tf_name in ["5M", "15M", "1H", "4H", "Daily", "Weekly"]:
            data = results.get(tf_name)
            if data:
                data["order"] = order
                data["timeframe"] = tf_name
                data["timeframeLabel"] = TIMEFRAME_LABELS.get(tf_name, tf_name)
                timeframes.append(data)
            order += 1

        timeframes.sort(key=lambda x: x.get("order", 99))

        # Legacy events format
        legacy_events = [
            {
                "event_slug": tf.get("strikeEventSlug"),
                "title": tf.get("strikeTitle"),
                "date": tf.get("endTime", "").split("T")[0] if tf.get("endTime") else "",
                "timeLabel": tf.get("timeframeLabel"),
                "volume": tf.get("strikeVolume", 0),
                "strikes": tf.get("strikes", []),
                "impliedPrice": tf.get("impliedPrice"),
                "marketCount": len(tf.get("strikes", [])),
            }
            for tf in timeframes
            if tf.get("strikes")
        ]

        # Generate betting guides by combining timeframe data with Chanlun predictions
        guides = await self._generate_guides(timeframes)

        # Fallback: generate Chanlun-only guides when no Polymarket markets active
        if not guides:
            guides = await self._generate_fallback_guides()

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "timeframes": timeframes,
            "guides": guides,
            "events": legacy_events,
        }

    async def _generate_guides(self, timeframes: list[dict]) -> list[dict]:
        """
        Generate BettingGuide objects by combining Polymarket timeframe data
        with live Chanlun analysis predictions.
        """
        if not timeframes:
            return []

        # Fetch current Chanlun analysis to get predictions
        try:
            from app.services.chanlun_service import ChanlunService
            chanlun_svc = ChanlunService()
            analysis = await chanlun_svc.full_analysis(symbol="BTC")
            predictions = analysis.get("predictions", [])
            current_price = analysis.get("currentPrice", 0)
        except Exception:
            return []

        if not predictions or current_price == 0:
            return []

        # Map Polymarket timeframes to Chanlun prediction timeframes
        tf_mapping = {
            "5M": "5m",
            "15M": "30m",   # closest match
            "1H": "1h",
            "4H": "4h",
            "Daily": "24h",
            "Weekly": "24h",  # use 24h as proxy
        }

        guides = []
        for tf_data in timeframes:
            tf_name = tf_data.get("timeframe", "")
            chanlun_tf = tf_mapping.get(tf_name)
            if not chanlun_tf:
                continue

            # Find matching Chanlun prediction
            pred = next((p for p in predictions if p["timeframe"] == chanlun_tf), None)
            if not pred:
                continue

            predicted_price = pred.get("targetPrice", current_price)
            hours_left = tf_data.get("hoursLeft", 1)
            end_time = tf_data.get("endTime", "")
            end_time_local = ""
            if end_time:
                try:
                    dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                    et_tz = ZoneInfo("America/New_York")
                    end_time_local = dt.astimezone(et_tz).strftime("%H:%M ET")
                except Exception:
                    pass

            # Determine base price:
            # Priority: Polymarket priceToBeat > impliedPrice > currentPrice
            up_prob = tf_data.get("upProb")
            down_prob = tf_data.get("downProb")
            implied_price = tf_data.get("impliedPrice")
            price_to_beat = tf_data.get("priceToBeat")
            base_price = price_to_beat or implied_price or current_price

            is_updown = up_prob is not None
            market_up_prob = round(up_prob * 100, 1) if up_prob is not None else None
            market_down_prob = round(down_prob * 100, 1) if down_prob is not None else None

            # Compute above-probability from Chanlun prediction
            predicted_delta = predicted_price - base_price
            predicted_delta_pct = (predicted_delta / base_price * 100) if base_price else 0

            # Chanlun's "above probability" — how likely price goes above base
            win_rate = pred.get("winRate", 50)
            direction = pred.get("direction", "sideways")
            if direction == "up":
                above_prob = max(55, min(85, 50 + win_rate * 0.3 + predicted_delta_pct * 2))
            elif direction == "down":
                above_prob = max(15, min(45, 50 - win_rate * 0.3 + predicted_delta_pct * 2))
            else:
                above_prob = 50 + predicted_delta_pct * 1.5
            above_prob = round(max(10, min(90, above_prob)), 1)

            # Determine action
            if above_prob >= 60 and direction == "up":
                action = "看涨买入"
            elif above_prob <= 40 and direction == "down":
                action = "看跌买入"
            else:
                action = "观望"

            # Build factors list
            factors = []
            if pred.get("triggers"):
                factors.extend(pred["triggers"][:3])
            if market_up_prob is not None:
                factors.append(f"Polymarket 看涨概率 {market_up_prob}%")
            if implied_price:
                factors.append(f"隐含价格 ${implied_price:,}")

            # Build reason
            if action == "看涨买入":
                reason = f"缠论趋势看涨 (置信度 {win_rate}%)，目标价 ${predicted_price:,.2f} 高于基准价"
            elif action == "看跌买入":
                reason = f"缠论趋势看跌 (置信度 {win_rate}%)，目标价 ${predicted_price:,.2f} 低于基准价"
            else:
                reason = f"缠论信号中性/不确定，建议观望当前时间框架"

            # Compute guide win rate (blend of Chanlun + market)
            guide_win_rate = win_rate
            if market_up_prob is not None and action == "看涨买入":
                guide_win_rate = round((win_rate + market_up_prob) / 2)
            elif market_down_prob is not None and action == "看跌买入":
                guide_win_rate = round((win_rate + market_down_prob) / 2)

            volume = tf_data.get("volume", 0)
            market_count = tf_data.get("marketCount", 0)

            guides.append({
                "timeframe": tf_name,
                "timeframeLabel": TIMEFRAME_LABELS.get(tf_name, tf_name),
                "action": action,
                "winRate": guide_win_rate,
                "currentPrice": round(current_price, 2),
                "basePrice": round(base_price, 2) if base_price else 0,
                "predictedPrice": round(predicted_price, 2),
                "predictedDelta": round(predicted_delta, 2),
                "predictedDeltaPct": round(predicted_delta_pct, 2),
                "aboveProb": above_prob,
                "hoursLeft": hours_left,
                "marketType": "updown" if is_updown else "strike",
                "marketUpProb": market_up_prob,
                "marketDownProb": market_down_prob,
                "reason": reason,
                "factors": factors,
                "volume": volume,
                "marketCount": market_count,
                "endTimeLocal": end_time_local,
                "upDownLink": tf_data.get("upDownLink"),
                "strikeEventSlug": tf_data.get("strikeEventSlug"),
            })

        return guides

    async def _generate_fallback_guides(self) -> list[dict]:
        """
        Generate guides based purely on Chanlun predictions when no Polymarket
        markets are active. Produces the same BettingGuide format so the
        PolymarketGuide component renders correctly.
        """
        try:
            from app.services.chanlun_service import ChanlunService
            chanlun_svc = ChanlunService()
            analysis = await chanlun_svc.full_analysis(symbol="BTC")
            predictions = analysis.get("predictions", [])
            current_price = analysis.get("currentPrice", 0)
        except Exception:
            return []

        if not predictions or current_price == 0:
            return []

        # Synthetic timeframes matching the old VIBE frontend
        synthetic_tfs = [
            {"name": "15M", "label": "15 分钟", "chanlun_tf": "30m", "hours": 0.25},
            {"name": "1H", "label": "1 小时", "chanlun_tf": "1h", "hours": 1},
            {"name": "4H", "label": "4 小时", "chanlun_tf": "4h", "hours": 4},
            {"name": "Daily", "label": "日线", "chanlun_tf": "24h", "hours": 24},
            {"name": "Weekly", "label": "周线", "chanlun_tf": "24h", "hours": 168},
        ]

        guides = []
        for stf in synthetic_tfs:
            pred = next((p for p in predictions if p["timeframe"] == stf["chanlun_tf"]), None)
            if not pred:
                continue

            predicted_price = pred.get("targetPrice", current_price)
            win_rate = pred.get("winRate", 50)
            direction = pred.get("direction", "sideways")
            predicted_delta = predicted_price - current_price
            predicted_delta_pct = (predicted_delta / current_price * 100) if current_price else 0

            # Compute above probability
            if direction == "up":
                above_prob = max(55, min(85, 50 + win_rate * 0.3 + predicted_delta_pct * 2))
            elif direction == "down":
                above_prob = max(15, min(45, 50 - win_rate * 0.3 + predicted_delta_pct * 2))
            else:
                above_prob = 50 + predicted_delta_pct * 1.5
            above_prob = round(max(10, min(90, above_prob)), 1)

            # Determine action
            if above_prob >= 60 and direction == "up":
                action = "看涨买入"
            elif above_prob <= 40 and direction == "down":
                action = "看跌买入"
            else:
                action = "观望"

            # Build reason
            if action == "看涨买入":
                reason = f"缠论趋势看涨 (置信度 {win_rate}%)，目标价 ${predicted_price:,.2f} 高于当前价"
            elif action == "看跌买入":
                reason = f"缠论趋势看跌 (置信度 {win_rate}%)，目标价 ${predicted_price:,.2f} 低于当前价"
            else:
                reason = f"缠论信号中性/不确定，建议观望当前时间框架"

            factors = pred.get("triggers", [])[:3]

            guides.append({
                "timeframe": stf["name"],
                "timeframeLabel": stf["label"],
                "action": action,
                "winRate": win_rate,
                "currentPrice": round(current_price, 2),
                "basePrice": round(current_price, 2),
                "predictedPrice": round(predicted_price, 2),
                "predictedDelta": round(predicted_delta, 2),
                "predictedDeltaPct": round(predicted_delta_pct, 2),
                "aboveProb": above_prob,
                "hoursLeft": stf["hours"],
                "marketType": "updown",
                "marketUpProb": None,
                "marketDownProb": None,
                "reason": reason,
                "factors": factors,
                "volume": 0,
                "marketCount": 0,
                "endTimeLocal": "",
                "upDownLink": None,
                "strikeEventSlug": None,
            })

        return guides

    # ── Timeframe fetchers ──

    async def _fetch_5m(self, et: dict) -> Optional[dict]:
        slugs = _gen_5m_slugs(et)
        for s in slugs:
            data = await self._process_updown_event(s["slug"])
            if data and data.get("upProb") is not None:
                return self._build_updown_tf(data)
        return None

    async def _fetch_15m(self, et: dict) -> Optional[dict]:
        slugs = _gen_15m_slugs(et)
        for s in slugs:
            data = await self._process_updown_event(s["slug"])
            if data and data.get("upProb") is not None:
                return self._build_updown_tf(data)
        return None

    async def _fetch_1h(self, et: dict) -> Optional[dict]:
        slugs = _gen_1h_slugs(et)
        updown_slugs = [s for s in slugs if s.get("type") == "updown"]
        strike_slugs = [s for s in slugs if s.get("type") == "strike"]

        best_ud = None
        for s in updown_slugs:
            data = await self._process_updown_event(s["slug"])
            if data and data.get("upProb") is not None:
                best_ud = data
                break

        best_strike = None
        for s in strike_slugs:
            data = await self._process_strike_event(s["slug"])
            if data and data.get("impliedPrice") is not None:
                best_strike = data
                break

        if best_ud or best_strike:
            return self._merge_updown_strike(best_ud, best_strike)
        return None

    async def _fetch_4h(self, et: dict) -> Optional[dict]:
        slugs = _gen_4h_slugs(et)
        for s in slugs:
            data = await self._process_updown_event(s["slug"])
            if data and data.get("upProb") is not None:
                return self._build_updown_tf(data)
        return None

    async def _fetch_daily(self, et: dict) -> Optional[dict]:
        slugs = _gen_daily_slugs(et)
        for s in slugs:
            data = await self._process_updown_event(s["slug"])
            if data and data.get("upProb") is not None:
                return self._build_updown_tf(data)
        return None

    async def _fetch_weekly(self, et: dict) -> Optional[dict]:
        slugs = _gen_weekly_slugs(et)
        for s in slugs:
            data = await self._process_strike_event(s["slug"])
            if data and data.get("impliedPrice") is not None:
                return {
                    "hoursLeft": data.get("hoursLeft", 0),
                    "endTime": data.get("endTime", ""),
                    "upProb": None, "downProb": None,
                    "upProbPct": None, "downProbPct": None,
                    "upDownEventSlug": None, "upDownTitle": None,
                    "upDownLink": None, "upDownVolume": 0,
                    "impliedPrice": data.get("impliedPrice"),
                    "strikes": data.get("strikes", []),
                    "strikeEventSlug": data.get("eventSlug"),
                    "strikeTitle": data.get("title"),
                    "strikeVolume": data.get("volume", 0),
                    "volume": data.get("volume", 0),
                    "marketCount": len(data.get("strikes", [])),
                }
        return None

    # ── Event processors ──

    async def _process_updown_event(self, slug: str) -> Optional[dict]:
        event = await self._fetch_event_by_slug(slug)
        if not event:
            return None

        now_sec = datetime.now(timezone.utc).timestamp()
        end_time = event.get("endDate") or event.get("end_date_iso") or ""
        if isinstance(end_time, str) and end_time:
            try:
                end_ts = datetime.fromisoformat(end_time.replace("Z", "+00:00")).timestamp()
            except Exception:
                end_ts = 0
        else:
            end_ts = float(end_time) if end_time else 0

        if end_ts <= now_sec:
            return None

        markets = event.get("markets", [])
        if not markets:
            return None

        market = markets[0]
        up_prob = None
        down_prob = None

        # Extract probabilities from outcomes
        outcomes = market.get("outcomes", [])
        outcome_prices = market.get("outcomePrices", [])
        # Gamma API may return these as JSON strings
        if isinstance(outcomes, str):
            try:
                outcomes = json.loads(outcomes)
            except (json.JSONDecodeError, TypeError):
                outcomes = []
        if isinstance(outcome_prices, str):
            try:
                outcome_prices = json.loads(outcome_prices)
            except (json.JSONDecodeError, TypeError):
                outcome_prices = []
        if outcomes and outcome_prices:
            try:
                prices = [float(p) for p in outcome_prices]
                for i, outcome in enumerate(outcomes):
                    if i < len(prices):
                        name = outcome.lower() if isinstance(outcome, str) else ""
                        if "up" in name or "yes" in name:
                            up_prob = prices[i]
                        elif "down" in name or "no" in name:
                            down_prob = prices[i]
            except (ValueError, TypeError):
                pass

        # Extract priceToBeat from eventMetadata (Chainlink BTC/USD snapshot)
        price_to_beat = None
        event_metadata = event.get("eventMetadata")
        if isinstance(event_metadata, str):
            try:
                event_metadata = json.loads(event_metadata)
            except (json.JSONDecodeError, TypeError):
                event_metadata = {}
        if isinstance(event_metadata, dict):
            ptb = event_metadata.get("priceToBeat")
            if ptb is not None:
                try:
                    price_to_beat = round(float(ptb), 2)
                except (ValueError, TypeError):
                    pass

        return {
            "eventSlug": event.get("slug", slug),
            "title": event.get("title", ""),
            "endTime": datetime.fromtimestamp(end_ts, tz=timezone.utc).isoformat() if end_ts else "",
            "hoursLeft": round((end_ts - now_sec) / 3600, 2) if end_ts else 0,
            "upProb": round(up_prob, 4) if up_prob is not None else None,
            "downProb": round(down_prob, 4) if down_prob is not None else None,
            "priceToBeat": price_to_beat,
            "volume": event.get("volume", 0),
            "link": f"https://polymarket.com/event/{event.get('slug', slug)}",
        }

    async def _process_strike_event(self, slug: str) -> Optional[dict]:
        event = await self._fetch_event_by_slug(slug)
        if not event:
            return None

        markets = event.get("markets", [])
        strikes = []
        for m in markets:
            strike_val = _parse_strike(m.get("question", "") or m.get("title", ""))
            if strike_val is None:
                continue

            # Extract yes/no prices
            outcomes = m.get("outcomes", [])
            prices = m.get("outcomePrices", [])
            # Gamma API may return these as JSON strings
            if isinstance(outcomes, str):
                try:
                    outcomes = json.loads(outcomes)
                except (json.JSONDecodeError, TypeError):
                    outcomes = []
            if isinstance(prices, str):
                try:
                    prices = json.loads(prices)
                except (json.JSONDecodeError, TypeError):
                    prices = []
            yes_price = 0.5
            no_price = 0.5
            if outcomes and prices:
                try:
                    price_list = [float(p) for p in prices]
                    for i, outcome in enumerate(outcomes):
                        if i < len(price_list):
                            name = outcome.lower() if isinstance(outcome, str) else ""
                            if "yes" in name:
                                yes_price = price_list[i]
                            elif "no" in name:
                                no_price = price_list[i]
                except (ValueError, TypeError):
                    pass

            strikes.append({
                "strike": strike_val,
                "yesPrice": round(yes_price, 4),
                "noPrice": round(no_price, 4),
                "yesPct": round(yes_price * 100, 2),
                "noPct": round(no_price * 100, 2),
                "volume": m.get("volume", 0),
            })

        strikes.sort(key=lambda s: s["strike"])
        if not strikes:
            return None

        implied = _compute_implied_price(strikes)
        return {
            "eventSlug": event.get("slug", slug),
            "title": event.get("title", ""),
            "strikes": strikes,
            "impliedPrice": implied,
            "volume": event.get("volume", 0),
        }

    async def _fetch_event_by_slug(self, slug: str) -> Optional[dict]:
        """Fetch event by slug using direct httpx request for reliability."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                resp = await c.get(
                    f"{self.client.base_url}/events",
                    params={"slug": slug},
                )
                resp.raise_for_status()
                events = resp.json()
                if events:
                    return events[0]
            return None
        except Exception as exc:
            logger.warning(f"Polymarket slug lookup failed: {slug} - {exc}")
            return None

    # ── Response builders ──

    def _build_updown_tf(self, data: dict) -> dict:
        return {
            "hoursLeft": data.get("hoursLeft", 0),
            "endTime": data.get("endTime", ""),
            "upProb": data.get("upProb"),
            "downProb": data.get("downProb"),
            "upProbPct": round(data["upProb"] * 100, 2) if data.get("upProb") is not None else None,
            "downProbPct": round(data["downProb"] * 100, 2) if data.get("downProb") is not None else None,
            "priceToBeat": data.get("priceToBeat"),
            "upDownEventSlug": data.get("eventSlug"),
            "upDownTitle": data.get("title"),
            "upDownLink": data.get("link"),
            "upDownVolume": data.get("volume", 0),
            "impliedPrice": None,
            "strikes": [],
            "strikeEventSlug": None, "strikeTitle": None, "strikeVolume": 0,
            "volume": data.get("volume", 0),
            "marketCount": 1,
        }

    def _merge_updown_strike(self, ud: Optional[dict], strike: Optional[dict]) -> dict:
        ref = ud or strike or {}
        result = {
            "hoursLeft": ref.get("hoursLeft", 0),
            "endTime": ref.get("endTime", ""),
            "upProb": ud.get("upProb") if ud else None,
            "downProb": ud.get("downProb") if ud else None,
            "upProbPct": round(ud["upProb"] * 100, 2) if ud and ud.get("upProb") is not None else None,
            "downProbPct": round(ud["downProb"] * 100, 2) if ud and ud.get("downProb") is not None else None,
            "priceToBeat": ud.get("priceToBeat") if ud else None,
            "upDownEventSlug": ud.get("eventSlug") if ud else None,
            "upDownTitle": ud.get("title") if ud else None,
            "upDownLink": ud.get("link") if ud else None,
            "upDownVolume": ud.get("volume", 0) if ud else 0,
            "impliedPrice": strike.get("impliedPrice") if strike else None,
            "strikes": strike.get("strikes", []) if strike else [],
            "strikeEventSlug": strike.get("eventSlug") if strike else None,
            "strikeTitle": strike.get("title") if strike else None,
            "strikeVolume": strike.get("volume", 0) if strike else 0,
            "volume": (ud.get("volume", 0) if ud else 0) + (strike.get("volume", 0) if strike else 0),
            "marketCount": (len(strike.get("strikes", [])) if strike else 0) + (1 if ud else 0),
        }
        return result


# ── Slug generators (identical logic to JS) ──

def _get_et_now() -> dict:
    et_tz = ZoneInfo("America/New_York")
    now_utc = datetime.now(timezone.utc)
    et = now_utc.astimezone(et_tz)
    return {
        "year": et.year, "month": et.month, "day": et.day,
        "hour": et.hour, "minute": et.minute,
        "now_sec": now_utc.timestamp(),
    }


def _gen_5m_slugs(et: dict) -> list[dict]:
    min5 = (et["minute"] // 5) * 5
    slugs = []
    for offset in range(2):
        start_min = min5 + offset * 5
        hour = et["hour"]
        day = et["day"]
        if start_min >= 60:
            start_min -= 60
            hour += 1
            if hour >= 24:
                hour = 0
                day += 1
        ts = _et_to_unix(et["year"], et["month"], day, hour, start_min)
        slugs.append({"slug": f"btc-updown-5m-{round(ts)}"})
    return slugs


def _gen_15m_slugs(et: dict) -> list[dict]:
    min15 = (et["minute"] // 15) * 15
    slugs = []
    for offset in range(2):
        start_min = min15 + offset * 15
        hour = et["hour"]
        day = et["day"]
        if start_min >= 60:
            start_min -= 60
            hour += 1
            if hour >= 24:
                hour = 0
                day += 1
        ts = _et_to_unix(et["year"], et["month"], day, hour, start_min)
        slugs.append({"slug": f"btc-updown-15m-{round(ts)}"})
    return slugs


def _gen_1h_slugs(et: dict) -> list[dict]:
    slugs = []
    for offset in range(2):
        hour = et["hour"] + offset
        day = et["day"]
        if hour >= 24:
            hour -= 24
            day += 1
        hr12 = hour % 12 or 12
        ampm = "am" if hour < 12 else "pm"
        month_name = MONTH_NAMES[et["month"]]
        slugs.append({
            "type": "updown",
            "slug": f"bitcoin-up-or-down-{month_name}-{day}-{et['year']}-{hr12}{ampm}-et",
        })
        slugs.append({
            "type": "strike",
            "slug": f"bitcoin-above-on-{month_name}-{day}-{hr12}{ampm}-et",
        })
    return slugs


def _gen_4h_slugs(et: dict) -> list[dict]:
    cur4h = (et["hour"] // 4) * 4
    slugs = []
    for offset in range(2):
        hour = cur4h + offset * 4
        day = et["day"]
        if hour >= 24:
            hour -= 24
            day += 1
        ts = _et_to_unix(et["year"], et["month"], day, hour, 0)
        slugs.append({"slug": f"btc-updown-4h-{round(ts)}"})
    return slugs


def _gen_daily_slugs(et: dict) -> list[dict]:
    month_name = MONTH_NAMES[et["month"]]
    return [
        {"slug": f"bitcoin-up-or-down-on-{month_name}-{et['day']}-{et['year']}"},
        {"slug": f"bitcoin-up-or-down-on-{month_name}-{et['day'] + 1}-{et['year']}"},
    ]


def _gen_weekly_slugs(et: dict) -> list[dict]:
    month_name = MONTH_NAMES[et["month"]]
    return [
        {"slug": f"bitcoin-above-on-{month_name}-{et['day'] + offset}"}
        for offset in range(4)
    ]


def _et_to_unix(year, month, day, hour, minute) -> float:
    et_tz = ZoneInfo("America/New_York")
    try:
        dt = datetime(year, month, day, hour, minute, tzinfo=et_tz)
        return dt.timestamp()
    except (ValueError, OverflowError):
        return 0


def _parse_strike(title: str) -> Optional[int]:
    m = re.search(r"above\s*\$?([\d,]+)", title, re.IGNORECASE)
    if m:
        return int(m.group(1).replace(",", ""))
    return None


def _compute_implied_price(strikes: list[dict]) -> Optional[int]:
    if not strikes:
        return None
    sorted_s = sorted(strikes, key=lambda s: s["strike"])
    for i in range(len(sorted_s) - 1):
        curr = sorted_s[i]
        nxt = sorted_s[i + 1]
        if curr["yesPrice"] >= 0.5 and nxt["yesPrice"] < 0.5:
            ratio = (0.5 - nxt["yesPrice"]) / (curr["yesPrice"] - nxt["yesPrice"])
            return round(nxt["strike"] - ratio * (nxt["strike"] - curr["strike"]))
    if sorted_s[0]["yesPrice"] < 0.5:
        return sorted_s[0]["strike"] - 1000
    if sorted_s[-1]["yesPrice"] >= 0.5:
        return sorted_s[-1]["strike"] + 1000
    return None
