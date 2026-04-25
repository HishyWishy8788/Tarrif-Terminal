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
