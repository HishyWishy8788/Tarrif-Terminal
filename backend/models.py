from typing import Literal, Optional
from pydantic import BaseModel, Field

EventCategory = Literal[
    "FOOD_GROCERIES",
    "FUEL_COMMUTE",
    "TRADE_GOODS_REPAIRS",
    "LABOR_INCOME",
    "RENT_UTILITIES",
    "UNCLASSIFIED",
]

SignalOrigin = Literal["GLOBAL", "MARKET", "DEMO"]
IntentState = Literal["PENDING", "APPROVED", "REJECTED", "SNOOZED"]
HousingType = Literal["RENT", "OWN_OUTRIGHT", "OTHER_FIXED_COST"]
SeedKey = Literal["food", "fuel", "repairs", "labor"]


class WorldSignal(BaseModel):
    id: str
    ts: str
    source: str
    title: str
    link: Optional[str] = None
    snippet: Optional[str] = None
    origin: SignalOrigin
    category: EventCategory
    confidence: float = Field(ge=0, le=1)
    rationale: str


class MicroImpact(BaseModel):
    monthlyCadLow: Optional[float] = None
    monthlyCadHigh: Optional[float] = None
    oneTimeCadLow: Optional[float] = None
    oneTimeCadHigh: Optional[float] = None
    horizon: str
    assumptions: list[str]
    formulaId: str
    formulaVersion: str


class IntentNarrative(BaseModel):
    causalChain: str
    recommendedAction: str


class AuditEntry(BaseModel):
    ts: str
    event: str
    note: Optional[str] = None


class AIIntent(BaseModel):
    id: str
    signal: WorldSignal
    impact: MicroImpact
    narrative: IntentNarrative
    state: IntentState
    createdAt: str
    updatedAt: str
    auditLog: list[AuditEntry] = []


class UserProfile(BaseModel):
    id: str
    incomeBand: str
    housingType: HousingType
    monthlyHousingCad: float = Field(ge=0)
    commuteKmPerWeek: float = Field(ge=0)
    dependents: int = Field(ge=0)
    sector: str
    gigMode: bool
    stressTags: list[str]


class SeedRequest(BaseModel):
    seedKey: str
    intentSeed: Optional[SeedKey] = None


class SnoozeRequest(BaseModel):
    minutes: int = Field(default=60, ge=1, le=24 * 60)


class HealthResponse(BaseModel):
    ok: bool
    version: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str


SeverityLevel = Literal["GREEN", "YELLOW", "RED"]


class SeverityResponse(BaseModel):
    level: SeverityLevel
    intentId: Optional[str] = None
    confidence: Optional[float] = None


class WaveSample(BaseModel):
    ts: float
    value: float


class LiveImpact(BaseModel):
    monthlyCadHigh: Optional[int] = None
    oneTimeCadHigh: Optional[int] = None
    category: Optional[EventCategory] = None
    multiplier: float = 1.0  # the news-pressure scalar applied


class LiveSnapshot(BaseModel):
    pressureByCategory: dict[str, float]
    tickerPrices: dict[str, float]
    waveSamples: list[WaveSample]
    activeImpact: LiveImpact
    headlineCount: int
    updatedAt: str
