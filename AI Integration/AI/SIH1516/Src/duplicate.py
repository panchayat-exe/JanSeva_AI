from math import radians, sin, cos, sqrt, atan2

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# -------------------------------------------------
# Calculate distance between two GPS coordinates
# -------------------------------------------------

def calculate_distance(lat1, lon1, lat2, lon2):

    earth_radius_km = 6371.0

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius_km * c


# -------------------------------------------------
# Duplicate detector
# -------------------------------------------------

def check_duplicate(
    new_complaint,
    existing_complaints,
    latitude=None,
    longitude=None,
    text_threshold=0.55,
    distance_threshold_km=0.5
):

    if not existing_complaints:

        return {
            "is_duplicate": False,
            "similarity": 0.0,
            "distance_km": None,
            "matched_complaint": None
        }

    texts = [
        complaint["text"]
        for complaint in existing_complaints
    ]

    all_texts = [new_complaint] + texts

    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=1
    )

    vectors = vectorizer.fit_transform(all_texts)

    similarities = cosine_similarity(
        vectors[0:1],
        vectors[1:]
    )[0]

    best_result = None

    for index, similarity in enumerate(similarities):

        complaint = existing_complaints[index]

        distance = None

        if (
            latitude is not None
            and longitude is not None
            and complaint.get("latitude") is not None
            and complaint.get("longitude") is not None
        ):

            distance = calculate_distance(
                latitude,
                longitude,
                complaint["latitude"],
                complaint["longitude"]
            )

        # Both text + GPS must agree
        duplicate = (
            similarity >= text_threshold
            and distance is not None
            and distance <= distance_threshold_km
        )

        # If GPS isn't available, only flag as
        # possible duplicate rather than confirmed.
        possible_duplicate = (
            similarity >= text_threshold
            and distance is None
        )

        candidate = {
            "is_duplicate": duplicate,
            "possible_duplicate": possible_duplicate,
            "similarity": float(similarity),
            "distance_km": distance,
            "matched_complaint": complaint["text"]
        }

        if (
            best_result is None
            or similarity > best_result["similarity"]
        ):
            best_result = candidate

    best_result["similarity"] = round(
        best_result["similarity"],
        3
    )

    if best_result["distance_km"] is not None:

        best_result["distance_km"] = round(
            best_result["distance_km"],
            3
        )

    return best_result