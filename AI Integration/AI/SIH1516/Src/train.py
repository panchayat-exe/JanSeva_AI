from pathlib import Path
import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


# -----------------------------
# PATHS
# -----------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "data" / "raw" / "SIH1516_Prototype_Complaints_Dataset.xlsx"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(exist_ok=True)


# -----------------------------
# LOAD DATA
# -----------------------------

print("Loading dataset...")

df = pd.read_excel(DATA_PATH, sheet_name="Complaints")

print(f"Total complaints: {len(df)}")


# -----------------------------
# TRAIN / TEST SPLIT
# -----------------------------

train_df = df[df["split"] == "Train"].copy()
test_df = df[df["split"] == "Test"].copy()

HARD_DATA_PATH = (
    BASE_DIR / "data" / "processed" / "hard_examples.csv"
)

hard_df = pd.read_csv(HARD_DATA_PATH)

print(f"Hard examples: {len(hard_df)}")

X_train = pd.concat(
    [
        train_df["complaint_text"],
        hard_df["complaint_text"]
    ],
    ignore_index=True
)

y_train = pd.concat(
    [
        train_df["subcategory"],
        hard_df["subcategory"]
    ],
    ignore_index=True
)

X_test = test_df["complaint_text"]
y_test = test_df["subcategory"]

print(f"Training samples: {len(train_df)}")
print(f"Testing samples: {len(test_df)}")


# -----------------------------
# TF-IDF
# -----------------------------

print("\nCreating TF-IDF features...")

vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    min_df=1,
    max_features=30000,
    sublinear_tf=True
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)


# -----------------------------
# TRAIN CLASSIFIER
# -----------------------------

print("Training Logistic Regression model...")

model = LogisticRegression(
    max_iter=2000,
    class_weight="balanced"
)

model.fit(X_train_tfidf, y_train)


# -----------------------------
# EVALUATION
# -----------------------------

predictions = model.predict(X_test_tfidf)

accuracy = accuracy_score(y_test, predictions)

print("\n==============================")
print("MODEL RESULTS")
print("==============================")

print(f"\nAccuracy: {accuracy * 100:.2f}%")

print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# -----------------------------
# SAVE MODEL
# -----------------------------

joblib.dump(
    model,
    MODEL_DIR / "complaint_classifier.pkl"
)

joblib.dump(
    vectorizer,
    MODEL_DIR / "tfidf_vectorizer.pkl"
)

print("\nModels saved successfully!")

print(
    MODEL_DIR / "complaint_classifier.pkl"
)

print(
    MODEL_DIR / "tfidf_vectorizer.pkl"
)