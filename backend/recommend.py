from models import ImpactEstimate, NewsItem, Profile, RecommendedAction

COMMUTER_MONTHLY_GAS_CAD = 300.0


def recommend(news: NewsItem, profile: Profile) -> RecommendedAction:
    if news.channel == "PRO_MIRROR":
        return _pro_mirror_action(news, profile)
    return _wallet_weather_action(news, profile)


def _pro_mirror_action(news: NewsItem, profile: Profile) -> RecommendedAction:
    held = {h.ticker for h in profile.stockStack}
    ticker = (news.tickers or [""])[0]
    pro = news.proName or "A pro investor"
    user_holds = ticker in held

    if news.proAction in ("BUY", "DISCLOSE"):
        if user_holds:
            return RecommendedAction(
                text=f"{pro} accumulating {ticker}. Hold through volatility — pro signal aligns with your position.",
                rationale=f"You hold {ticker}; pro {news.proAction} on held ticker.",
            )
        return RecommendedAction(
            text=f"{pro} just disclosed a stake in {ticker}. Add to watchlist?",
            rationale=f"You do not hold {ticker}; pro {news.proAction} on new ticker.",
        )

    if news.proAction == "SELL":
        if user_holds:
            return RecommendedAction(
                text=f"{pro} reduced {ticker}. Review your thesis.",
                rationale=f"You hold {ticker}; pro SELL on held ticker.",
            )
        return RecommendedAction(
            text=f"{pro} exited {ticker}. No action — informational.",
            rationale=f"You do not hold {ticker}; pro SELL on unrelated ticker.",
        )

    return RecommendedAction(
        text=news.summary,
        rationale="Informational pro signal.",
    )


def _wallet_weather_action(news: NewsItem, profile: Profile) -> RecommendedAction:
    metric = news.metric
    pct = news.changePct or 0
    direction = "up" if pct >= 0 else "down"
    abs_pct = abs(pct)

    if metric == "GAS":
        if not profile.household.commuter:
            return RecommendedAction(
                text=f"Gas {direction} {abs_pct}%. No direct impact — household isn't a commuter.",
                rationale="Non-commuter household; gas signal informational.",
            )
        impact = _impact(COMMUTER_MONTHLY_GAS_CAD, pct)
        return RecommendedAction(
            text=f"Gas {direction} {abs_pct}%. Budget ~${impact.monthlyLow}–${impact.monthlyHigh}/month {direction}.",
            rationale=f"Commuter household; gas {direction} {abs_pct}% applied to ~${COMMUTER_MONTHLY_GAS_CAD:.0f}/mo fuel base.",
            estImpactCad=impact,
        )

    if metric == "GROCERY":
        base_monthly = profile.household.weeklyGroceryCad * 4
        impact = _impact(base_monthly, pct)
        return RecommendedAction(
            text=f"Grocery prices {direction} {abs_pct}%. Expect ~${impact.monthlyLow}–${impact.monthlyHigh}/month {direction} on food.",
            rationale=f"Grocery {direction} {abs_pct}% applied to ${base_monthly:.0f}/mo basket.",
            estImpactCad=impact,
        )

    if metric == "RATES":
        harder = "harder" if pct >= 0 else "easier"
        return RecommendedAction(
            text=f"BoC rate {direction} {abs_pct} bps. Variable-rate borrowing gets {harder}.",
            rationale="Rate move; affects variable-rate exposure.",
        )

    return RecommendedAction(
        text=f"{news.summary} Watch for ripple to household costs.",
        rationale="World event; downstream impact uncertain.",
    )


def _impact(base_monthly: float, pct: float) -> ImpactEstimate:
    pct_decimal = pct / 100.0
    return ImpactEstimate(
        monthlyLow=round(base_monthly * pct_decimal * 0.8),
        monthlyHigh=round(base_monthly * pct_decimal * 1.2),
    )
