from pathlib import Path
import joblib
import numpy as np


BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "complaint_classifier.pkl"
VECTORIZER_PATH = BASE_DIR / "models" / "tfidf_vectorizer.pkl"


# Load trained model
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)


# Subcategory → Category → Department
TAXONOMY = {

    "Pothole":
        ("Roads & Footpaths", "Roads & Public Works"),

    "Damaged Road":
        ("Roads & Footpaths", "Roads & Public Works"),

    "Damaged Footpath":
        ("Roads & Footpaths", "Roads & Public Works"),

    "Road Obstruction":
        ("Roads & Footpaths", "Roads & Public Works"),

    "No Water Supply":
        ("Water Supply", "Water Supply"),

    "Water Leakage":
        ("Water Supply", "Water Supply"),

    "Low Water Pressure":
        ("Water Supply", "Water Supply"),

    "Contaminated Water":
        ("Water Supply", "Water Supply"),

    "Blocked Drain":
        ("Drainage & Sewerage", "Sewerage & Drainage"),

    "Sewage Overflow":
        ("Drainage & Sewerage", "Sewerage & Drainage"),

    "Open/Broken Drain":
        ("Drainage & Sewerage", "Sewerage & Drainage"),

    "Waterlogging":
        ("Drainage & Sewerage", "Sewerage & Drainage"),

    "Garbage Not Collected":
        ("Garbage & Sanitation", "Solid Waste Management"),

    "Overflowing Garbage Bin":
        ("Garbage & Sanitation", "Solid Waste Management"),

    "Illegal Garbage Dumping":
        ("Garbage & Sanitation", "Solid Waste Management"),

    "Dead Animal":
        ("Garbage & Sanitation", "Solid Waste Management"),

    "Streetlight Not Working":
        ("Street Lighting", "Electrical / Street Lighting"),

    "Damaged Streetlight Pole":
        ("Street Lighting", "Electrical / Street Lighting"),

    "Exposed Electrical Wire":
        ("Street Lighting", "Electrical / Street Lighting"),

    "Fallen Tree":
        ("Parks & Trees", "Parks & Horticulture"),

    "Dangerous Tree":
        ("Parks & Trees", "Parks & Horticulture"),

    "Damaged Park":
        ("Parks & Trees", "Parks & Horticulture"),

    "Park Maintenance":
        ("Parks & Trees", "Parks & Horticulture"),

    "Traffic Signal Not Working":
        ("Traffic Infrastructure", "Traffic Management"),

    "Damaged Traffic Sign":
        ("Traffic Infrastructure", "Traffic Management"),

    "Road Marking Issue":
        ("Traffic Infrastructure", "Traffic Management"),

    "Traffic Obstruction":
        ("Traffic Infrastructure", "Traffic Management"),

    "Illegal Encroachment":
        ("Encroachment & Public Infrastructure",
         "Municipal / Encroachment"),

    "Illegal Construction":
        ("Encroachment & Public Infrastructure",
         "Municipal / Encroachment"),

    "Damaged Public Property":
        ("Encroachment & Public Infrastructure",
         "Municipal / Encroachment"),

    "Unauthorized Hoarding":
        ("Encroachment & Public Infrastructure",
         "Municipal / Encroachment")
}


def analyze_complaint(text):

    vector = vectorizer.transform([text])

    prediction = model.predict(vector)[0]

    probabilities = model.predict_proba(vector)[0]

    confidence = np.max(probabilities)

    category, department = TAXONOMY[prediction]

    return {
        "complaint": text,
        "subcategory": prediction,
        "category": category,
        "department": department,
        "confidence": round(float(confidence), 3)
    }


if __name__ == "__main__":

    print("\n================================")
    print(" SIH1516 GRIEVANCE AI")
    print("================================")

    while True:

        complaint = input(
            "\nEnter complaint (or type 'exit'): "
        )

        if complaint.lower() == "exit":
            break

        result = analyze_complaint(complaint)

        print("\nAI ANALYSIS")
        print("-------------------------------")

        print("Subcategory :", result["subcategory"])
        print("Category    :", result["category"])
        print("Department  :", result["department"])
        print(
            "Confidence  :",
            f'{result["confidence"] * 100:.2f}%'
        )