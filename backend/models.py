from typing import Literal, Optional
from pydantic import BaseModel, Field

Channel = Literal["PRO_MIRROR", "WALLET_WEATHER"]
Severity = Literal["INFO", "WATCH", "BREAKING"]
IntentState = Literal["PENDING", "APPROVED", "REJECTED", "SNOOZED"]
ProAction = Literal["BUY", "SELL", "HOLD", "DISCLOSE"]
WalletMetric = Literal["GROCERY", "GAS", "RATES", "WORLD_EVENT"]


class NewsItem(BaseModel):
    id: str
    channel: Channel
    severity: Severity
    ts: str
    source: str
    headline: str
    summary: str
    tickers: Optional[list[str]] = None
    proName: Optional[str] = None
    proAction: Optional[ProAction] = None
    metric: Optional[WalletMetric] = None
    changePct: Optional[float] = None


class ImpactEstimate(BaseModel):
    monthlyLow: float
    monthlyHigh: float


class RecommendedAction(BaseModel):
    text: str
    rationale: str
    estImpactCad: Optional[ImpactEstimate] = None


class Intent(BaseModel):
    id: str
    news: NewsItem
    action: RecommendedAction
    state: IntentState
    createdAt: str
    updatedAt: str


class StockHolding(BaseModel):
    ticker: str
    shares: float


class Household(BaseModel):
    dependents: int
    commuter: bool
    weeklyGroceryCad: float


class Profile(BaseModel):
    id: str
    name: str
    household: Household
    stockStack: list[StockHolding]


class SeedRequest(BaseModel):
    seedKey: str
    newsId: Optional[str] = None


class SnoozeRequest(BaseModel):
    minutes: int = Field(default=60, ge=1, le=24 * 60)


class HealthResponse(BaseModel):
    ok: bool
    version: str
