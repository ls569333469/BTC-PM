"""
ZhongShu (中枢) construction — pivot zones from Bi points.
Direct port from chanlun.js findZhongShu() with identical logic.
"""


def find_zhongshu(bis: list[dict]) -> list[dict]:
    """
    Build pivot zones (ZhongShu) from Bi points.
    A ZhongShu requires at least 3 overlapping Bi strokes (4 Bi points).

    Args:
        bis: list of BiPoint dicts from find_bi()

    Returns:
        list of ZhongShu dicts: {high, low, center, start_index, end_index, start_time, end_time}
    """
    if len(bis) < 4:
        return []

    zones: list[dict] = []

    for i in range(len(bis) - 3):
        prices = [bis[i + j]["price"] for j in range(4)]

        # Overlap calculation:
        # high = min of the two pair-maxes
        # low  = max of the two pair-mins
        high = min(max(prices[0], prices[1]), max(prices[2], prices[3]))
        low = max(min(prices[0], prices[1]), min(prices[2], prices[3]))

        if high > low:
            zones.append({
                "high": high,
                "low": low,
                "center": (high + low) / 2,
                "start_index": bis[i]["index"],
                "end_index": bis[i + 3]["index"],
                "start_time": bis[i].get("time", ""),
                "end_time": bis[i + 3].get("time", ""),
            })

    # Merge overlapping zones
    merged: list[dict] = []
    for z in zones:
        if merged:
            last = merged[-1]
            if z["low"] <= last["high"] and z["high"] >= last["low"]:
                last["high"] = max(last["high"], z["high"])
                last["low"] = min(last["low"], z["low"])
                last["center"] = (last["high"] + last["low"]) / 2
                last["end_index"] = z["end_index"]
                last["end_time"] = z["end_time"]
                continue
        merged.append({**z})

    return merged
