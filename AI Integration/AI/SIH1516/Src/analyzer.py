# ============================================================
# SIH1516 - COMPLETE GRIEVANCE ANALYZER
# ============================================================

from predict import analyze_complaint
from priority import determine_priority
from duplicate import check_duplicate



def analyze(
    complaint,
    existing_complaints=None,
    latitude=None,
    longitude=None
):
    """
    Complete grievance analysis pipeline.

    Performs:
    1. Complaint classification
    2. Department routing
    3. Priority detection
    4. Duplicate detection
    """

    # --------------------------------------------------------
    # SAFETY / DEFAULT VALUES
    # --------------------------------------------------------

    if existing_complaints is None:
        existing_complaints = []

    complaint = complaint.strip()

    # --------------------------------------------------------
    # 1. AI CLASSIFICATION
    # --------------------------------------------------------

    prediction = analyze_complaint(complaint)

    subcategory = prediction["subcategory"]

    # --------------------------------------------------------
    # 2. PRIORITY DETECTION
    # --------------------------------------------------------

    priority_result = determine_priority(
        complaint,
        subcategory
    )

    # --------------------------------------------------------
    # 3. DUPLICATE DETECTION
    # --------------------------------------------------------

    try:

        duplicate_result = check_duplicate(
            complaint,
            existing_complaints,
            latitude,
            longitude
        )

    except Exception as error:

        print(
            "Duplicate detection error:",
            error
        )

        duplicate_result = {
            "is_duplicate": False,
            "duplicate_similarity": 0.0,
            "matched_complaint": None,
            "possible_duplicate": False,
            "duplicate_distance_km": None
        }

    # --------------------------------------------------------
    # NORMALIZE DUPLICATE RESULT
    # --------------------------------------------------------

    if duplicate_result is None:
        duplicate_result = {}

    is_duplicate = duplicate_result.get(
        "is_duplicate",
        False
    )

    duplicate_similarity = duplicate_result.get(
        "duplicate_similarity",
        0.0
    )

    matched_complaint = duplicate_result.get(
        "matched_complaint",
        None
    )

    possible_duplicate = duplicate_result.get(
        "possible_duplicate",
        False
    )

    duplicate_distance_km = duplicate_result.get(
        "duplicate_distance_km",
        None
    )

    # --------------------------------------------------------
    # 4. FINAL RESULT
    # --------------------------------------------------------

    result = {

        "complaint":
            complaint,

        "subcategory":
            prediction["subcategory"],

        "category":
            prediction["category"],

        "department":
            prediction["department"],

        "confidence":
            prediction["confidence"],

        "priority":
            priority_result["priority"],

        "critical_indicators":
            priority_result["critical_indicators"],

        "high_risk_indicators":
            priority_result["high_risk_indicators"],

        "is_duplicate":
            bool(is_duplicate),

        "duplicate_similarity":
            duplicate_similarity,

        "matched_complaint":
            matched_complaint,

        "possible_duplicate":
            bool(possible_duplicate),

        "duplicate_distance_km":
            duplicate_distance_km
    }

    return result


# ============================================================
# TEST ANALYZER
# ============================================================

if __name__ == "__main__":

    test_complaints = [

        {
            "text":
                "big pothole outside central school",

            "latitude":
                22.3072,

            "longitude":
                73.1812
        },

        {
            "text":
                "water pipeline leaking near railway station",

            "latitude":
                22.3100,

            "longitude":
                73.1800
        }
    ]

    result = analyze(

        "live electric wire fallen on road, person injured",

        test_complaints,

        22.3050,

        73.1900
    )

    print("\n================================")
    print("GRIEVANCE ANALYSIS")
    print("================================")

    for key, value in result.items():
        print(f"{key}: {value}")