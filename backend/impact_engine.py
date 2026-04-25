from models import EventCategory, MicroImpact, UserProfile

FORMULA_VERSION = "1.0"

GROCERY_PER_ADULT_CAD = 525.0
GROCERY_PER_DEPENDENT_CAD = 263.0
GROCERY_SENSITIVITY_LOW = 0.036
GROCERY_SENSITIVITY_HIGH = 0.070

FUEL_LITRES_PER_KM = 0.11
WEEKS_PER_MONTH = 4.33
FUEL_PRICE_MOVEMENT_LOW_CAD = 0.10
FUEL_PRICE_MOVEMENT_HIGH_CAD = 0.25

REPAIR_BASKET_CAD = 1500.0
REPAIR_PASS_THROUGH_LOW = 0.08
REPAIR_PASS_THROUGH_HIGH = 0.18

UTILITIES_BASE_FRACTION_OF_RENT = 0.05
UTILITIES_SENSITIVITY_LOW = 0.04
UTILITIES_SENSITIVITY_HIGH = 0.12


def compute_impact(category: EventCategory, profile: UserProfile) -> MicroImpact:
    if category == "FOOD_GROCERIES":
        return _grocery_impact(profile)
    if category == "FUEL_COMMUTE":
        return _fuel_impact(profile)
    if category == "TRADE_GOODS_REPAIRS":
        return _repair_impact(profile)
    if category == "LABOR_INCOME":
        return _labor_impact(profile)
    if category == "RENT_UTILITIES":
        return _utilities_impact(profile)
    return _unclassified_impact()


def _grocery_impact(profile: UserProfile) -> MicroImpact:
    monthly_basket = GROCERY_PER_ADULT_CAD + profile.dependents * GROCERY_PER_DEPENDENT_CAD
    return MicroImpact(
        monthlyCadLow=round(monthly_basket * GROCERY_SENSITIVITY_LOW),
        monthlyCadHigh=round(monthly_basket * GROCERY_SENSITIVITY_HIGH),
        oneTimeCadLow=None,
        oneTimeCadHigh=None,
        horizon="next 30 days",
        assumptions=[
            "Calculator: imported grocery basket.",
            f"Based on a ${monthly_basket:.0f} monthly grocery baseline (1 adult + {profile.dependents} dependents).",
            f"Uses a {GROCERY_SENSITIVITY_LOW*100:.1f}% to {GROCERY_SENSITIVITY_HIGH*100:.1f}% sensitivity range for imported staples.",
            "Horizon: next 30 days.",
        ],
        formulaId="FOOD_GROCERIES_BASKET_V1",
        formulaVersion=FORMULA_VERSION,
    )


def _fuel_impact(profile: UserProfile) -> MicroImpact:
    monthly_km = profile.commuteKmPerWeek * WEEKS_PER_MONTH
    monthly_litres = monthly_km * FUEL_LITRES_PER_KM
    return MicroImpact(
        monthlyCadLow=round(monthly_litres * FUEL_PRICE_MOVEMENT_LOW_CAD),
        monthlyCadHigh=round(monthly_litres * FUEL_PRICE_MOVEMENT_HIGH_CAD),
        oneTimeCadLow=None,
        oneTimeCadHigh=None,
        horizon="next 30 days",
        assumptions=[
            "Calculator: fuel price x commute distance.",
            f"Based on {profile.commuteKmPerWeek:.0f} km per week and {FUEL_LITRES_PER_KM*100:.0f} L/100km blended urban efficiency.",
            f"Uses a ${FUEL_PRICE_MOVEMENT_LOW_CAD:.2f} to ${FUEL_PRICE_MOVEMENT_HIGH_CAD:.2f} per litre retail movement range.",
            "Horizon: next 30 days.",
        ],
        formulaId="FUEL_COMMUTE_LITRES_V1",
        formulaVersion=FORMULA_VERSION,
    )


def _repair_impact(profile: UserProfile) -> MicroImpact:
    return MicroImpact(
        monthlyCadLow=None,
        monthlyCadHigh=None,
        oneTimeCadLow=round(REPAIR_BASKET_CAD * REPAIR_PASS_THROUGH_LOW),
        oneTimeCadHigh=round(REPAIR_BASKET_CAD * REPAIR_PASS_THROUGH_HIGH),
        horizon="next 90 days",
        assumptions=[
            "Calculator: repair parts tariff pass-through.",
            f"Uses a ${REPAIR_BASKET_CAD:.0f} appliance repair basket estimate.",
            f"Applies a {REPAIR_PASS_THROUGH_LOW*100:.0f}% to {REPAIR_PASS_THROUGH_HIGH*100:.0f}% pass-through range.",
            "Horizon: next 90 days.",
        ],
        formulaId="TRADE_GOODS_REPAIRS_BASKET_V1",
        formulaVersion=FORMULA_VERSION,
    )


def _labor_impact(profile: UserProfile) -> MicroImpact:
    return MicroImpact(
        monthlyCadLow=None,
        monthlyCadHigh=None,
        oneTimeCadLow=None,
        oneTimeCadHigh=None,
        horizon="next 60 days",
        assumptions=[
            "Calculator: sector planning alert.",
            f"Matched against profile sector: {profile.sector}.",
            "No dollar estimate shown without confirmed income details.",
            "Horizon: next 60 days.",
        ],
        formulaId="LABOR_INCOME_PLANNING_V1",
        formulaVersion=FORMULA_VERSION,
    )


def _utilities_impact(profile: UserProfile) -> MicroImpact:
    base = profile.monthlyHousingCad * UTILITIES_BASE_FRACTION_OF_RENT
    return MicroImpact(
        monthlyCadLow=round(base * (1 + UTILITIES_SENSITIVITY_LOW) - base),
        monthlyCadHigh=round(base * (1 + UTILITIES_SENSITIVITY_HIGH) - base),
        oneTimeCadLow=None,
        oneTimeCadHigh=None,
        horizon="next 30 days",
        assumptions=[
            "Calculator: utilities sensitivity vs housing cost.",
            f"Based on ${base:.0f}/month utility baseline ({UTILITIES_BASE_FRACTION_OF_RENT*100:.0f}% of housing).",
            f"Applies a {UTILITIES_SENSITIVITY_LOW*100:.0f}% to {UTILITIES_SENSITIVITY_HIGH*100:.0f}% sensitivity range.",
            "Horizon: next 30 days.",
        ],
        formulaId="RENT_UTILITIES_BASE_V1",
        formulaVersion=FORMULA_VERSION,
    )


def _unclassified_impact() -> MicroImpact:
    return MicroImpact(
        monthlyCadLow=None,
        monthlyCadHigh=None,
        oneTimeCadLow=None,
        oneTimeCadHigh=None,
        horizon="under review",
        assumptions=["Calculator: unclassified — no dollar estimate available."],
        formulaId="UNCLASSIFIED_NONE_V1",
        formulaVersion=FORMULA_VERSION,
    )
