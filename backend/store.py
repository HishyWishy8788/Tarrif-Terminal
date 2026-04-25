import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from models import Intent, NewsItem, Profile
from recommend import recommend

DATA_DIR = Path(__file__).parent / "data"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Store:
    def __init__(self) -> None:
        self.profile: Profile
        self.news_by_id: dict[str, NewsItem] = {}
        self.feed: list[NewsItem] = []
        self.intents: dict[str, Intent] = {}
        self._intent_counter = 0
        self.load()

    def load(self) -> None:
        with (DATA_DIR / "profile.json").open() as f:
            self.profile = Profile.model_validate(json.load(f))

        feed: list[NewsItem] = []
        for fname in ("pro_mirror.json", "wallet_weather.json"):
            with (DATA_DIR / fname).open() as f:
                feed.extend(NewsItem.model_validate(item) for item in json.load(f))
        feed.sort(key=lambda n: n.ts, reverse=True)
        self.feed = feed
        self.news_by_id = {n.id: n for n in feed}

        self.intents = {}
        self._intent_counter = 0
        self._seed_initial_intents()

    def _seed_initial_intents(self) -> None:
        for news_id in ("news_001", "news_006"):
            news = self.news_by_id.get(news_id)
            if news:
                self.create_intent(news)

    def create_intent(self, news: NewsItem) -> Intent:
        self._intent_counter += 1
        now = _now_iso()
        intent = Intent(
            id=f"intent_{self._intent_counter:03d}",
            news=news,
            action=recommend(news, self.profile),
            state="PENDING",
            createdAt=now,
            updatedAt=now,
        )
        self.intents[intent.id] = intent
        return intent

    def list_feed(self, channel: Optional[str] = None) -> list[NewsItem]:
        if channel is None:
            return self.feed
        return [n for n in self.feed if n.channel == channel]

    def breaking(self) -> Optional[NewsItem]:
        breaking_items = [n for n in self.feed if n.severity == "BREAKING"]
        if breaking_items:
            return breaking_items[0]
        return self.feed[0] if self.feed else None

    def list_intents(self, state: Optional[str] = None) -> list[Intent]:
        items = sorted(self.intents.values(), key=lambda i: i.createdAt, reverse=True)
        if state is None:
            return items
        return [i for i in items if i.state == state]

    def active_intent(self) -> Optional[Intent]:
        pending = [i for i in self.intents.values() if i.state == "PENDING"]
        pending.sort(key=lambda i: i.createdAt, reverse=True)
        return pending[0] if pending else None

    def transition(self, intent_id: str, new_state: str) -> Optional[Intent]:
        intent = self.intents.get(intent_id)
        if intent is None:
            return None
        intent.state = new_state  # type: ignore[assignment]
        intent.updatedAt = _now_iso()
        return intent

    def reset(self) -> None:
        self.load()


store = Store()
