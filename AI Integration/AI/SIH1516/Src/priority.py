# ============================================================
# SIH1516 - PRIORITY ENGINE
# Determines complaint urgency using complaint text
# ============================================================


CRITICAL_KEYWORDS = [
    "person injured",
    "people injured",
    "injured",
    "electric shock",
    "electrocution",
    "live wire",
    "live electric wire",
    "exposed electrical wire",
    "fallen electric wire",
    "fire",
    "explosion",
    "collapsed",
    "building collapse",
    "life threatening",
    "life-threatening",
    "death",
    "dead body",
    "major accident",
    "severe accident"
]


HIGH_RISK_KEYWORDS = [
    "school",
    "hospital",
    "children",
    "child",
    "elderly",
    "dangerous",
    "emergency",
    "heavy leakage",
    "sewage overflow",
    "sewage overflowing",
    "contaminated water",
    "waterlogging",
    "blocked road",
    "fallen tree",
    "traffic signal",
    "exposed wire",
    "electric wire"
]


MEDIUM_KEYWORDS = [
    "pothole",
    "damaged road",
    "road damage",
    "water leakage",
    "pipeline leaking",
    "blocked drain",
    "garbage",
    "streetlight",
    "footpath",
    "road obstruction",
    "park",
    "traffic sign"
]


def determine_priority(complaint, subcategory=None):
    """
    Determine priority of a grievance.

    Returns:
        {
            "priority": "CRITICAL/HIGH/MEDIUM/LOW",
            "critical_indicators": [],
            "high_risk_indicators": []
        }
    """

    text = complaint.lower().strip()

    critical_indicators = []
    high_risk_indicators = []

    # --------------------------------------------------------
    # CRITICAL INDICATORS
    # --------------------------------------------------------

    for keyword in CRITICAL_KEYWORDS:
        if keyword in text:
            critical_indicators.append(keyword)

    # Electrical hazards are inherently dangerous
    if subcategory == "Exposed Electrical Wire":
        if "electrical hazard" not in critical_indicators:
            critical_indicators.append("electrical hazard")

    # --------------------------------------------------------
    # HIGH RISK INDICATORS
    # --------------------------------------------------------

    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in text:
            high_risk_indicators.append(keyword)

    # --------------------------------------------------------
    # DETERMINE PRIORITY
    # --------------------------------------------------------

    if critical_indicators:

        priority = "CRITICAL"

    elif high_risk_indicators:

        priority = "HIGH"

    elif any(keyword in text for keyword in MEDIUM_KEYWORDS):

        priority = "MEDIUM"

    else:

        priority = "LOW"

    return {
        "priority": priority,
        "critical_indicators": list(dict.fromkeys(critical_indicators)),
        "high_risk_indicators": list(dict.fromkeys(high_risk_indicators))
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    tests = [
        (
            "live electric wire fallen on road, person injured",
            "Exposed Electrical Wire"
        ),
        (
            "big pothole outside central school",
            "Pothole"
        ),
        (
            "garbage bin overflowing near market",
            "Overflowing Garbage Bin"
        ),
        (
            "small park needs maintenance",
            "Park Maintenance"
        )
    ]

    for complaint, subcategory in tests:

        result = determine_priority(
            complaint,
            subcategory
        )

        print("\nComplaint:", complaint)
        print("Priority:", result["priority"])
        print(
            "Critical indicators:",
            result["critical_indicators"]
        )
        print(
            "High risk indicators:",
            result["high_risk_indicators"]
        )