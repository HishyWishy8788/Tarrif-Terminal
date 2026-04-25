import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from impact_engine import compute_impact
from models import (
    AIIntent,
    AuditEntry,
    IntentNarrative,
    IntentState,
    UserProfile,
    WorldSignal,
)

DATA_DIR = Path(__file__).parent / "data"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Store:
    def __init__(self) -> None:
        self.profile: UserProfile
        self.signals_by_id: dict[str, WorldSignal] = {}
        self.signals: list[WorldSignal] = []
        self.seeds: dict[str, dict] = {}
        self.intents: dict[str, AIIntent] = {}
        self._intent_counter = 0
        self.load()

    def load(self) -> None:
        with (DATA_DIR / "profile.json").open() as f:
            self.profile = UserProfile.model_validate(json.load(f))

        with (DATA_DIR / "signals.json").open() as f:
            raw_signals = json.load(f)
        signals = [WorldSignal.model_validate(s) for s in raw_signals]
        signals.sort(key=lambda s: s.ts, reverse=True)
        self.signals = signals
        self.signals_by_id = {s.id: s for s in signals}

        with (DATA_DIR / "seeds.json").open() as f:
            self.seeds = json.load(f)

        self.intents = {}
        self._intent_counter = 0
        self.create_intent_from_seed("food")

    def create_intent_from_seed(self, seed_key: str) -> AIIntent:
        seed = self.seeds.get(seed_key)
        if seed is None:
            raise KeyError(f"unknown seed: {seed_key}")
        signal = self.signals_by_id.get(seed["signalId"])
        if signal is None:
            raise KeyError(f"seed references unknown signal: {seed['signalId']}")
        return self._create_intent(
            signal=signal,
            causal_chain=seed["causalChain"],
            recommended_action=seed["recommendedAction"],
            seed_key=seed_key,
        )

    def _create_intent(
        self,
        signal: WorldSignal,
        causal_chain: str,
        recommended_action: str,
        seed_key: Optional[str] = None,
    ) -> AIIntent:
        self._intent_counter += 1
        ts = now_iso()
        intent = AIIntent(
            id=f"intent_{self._intent_counter:03d}",
            signal=signal,
            impact=compute_impact(signal.category, self.profile),
            narrative=IntentNarrative(
                causalChain=causal_chain,
                recommendedAction=recommended_action,
            ),
            state="PENDING",
            createdAt=ts,
            updatedAt=ts,
            auditLog=[
                AuditEntry(
                    ts=ts,
                    event="CREATED",
                    note=f"Seeded from key={seed_key}" if seed_key else "Created",
                )
            ],
        )
        self.intents[intent.id] = intent
        return intent

    def list_signals(self, origin: Optional[str] = None) -> list[WorldSignal]:
        if origin is None:
            return self.signals
        return [s for s in self.signals if s.origin == origin]

    def list_intents(self, state: Optional[str] = None) -> list[AIIntent]:
        items = sorted(self.intents.values(), key=lambda i: i.createdAt, reverse=True)
        if state is None:
            return items
        return [i for i in items if i.state == state]

    def active_intent(self) -> Optional[AIIntent]:
        pending = [i for i in self.intents.values() if i.state == "PENDING"]
        pending.sort(key=lambda i: i.createdAt, reverse=True)
        return pending[0] if pending else None

    def transition(
        self,
        intent_id: str,
        new_state: IntentState,
        note: Optional[str] = None,
    ) -> Optional[AIIntent]:
        intent = self.intents.get(intent_id)
        if intent is None:
            return None
        ts = now_iso()
        intent.state = new_state
        intent.updatedAt = ts
        intent.auditLog.append(
            AuditEntry(ts=ts, event=f"STATE_{new_state}", note=note)
        )
        return intent

    def replace_profile(self, profile: UserProfile) -> UserProfile:
        self.profile = profile
        return self.profile

    def reset(self) -> None:
        self.load()


store = Store()
