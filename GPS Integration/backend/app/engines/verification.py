"""
JANSEVA GeoVision – Engine 8: Resolution Verification Engine
Compares before/after evidence images to verify civic issue resolution.
Uses pixel-level analysis (histogram correlation + structural comparison).
"""
import os
import math
from PIL import Image


def compare_images_histogram(before_path: str, after_path: str) -> float:
    """
    Compare two images using histogram correlation.
    Returns a dissimilarity score (0.0 = identical, 1.0 = completely different).
    Higher dissimilarity = issue likely fixed (scene changed).
    
    For resolution verification, we WANT the images to be different
    (meaning the issue has been fixed).
    """
    try:
        img1 = Image.open(before_path).convert("RGB").resize((256, 256))
        img2 = Image.open(after_path).convert("RGB").resize((256, 256))

        # Compute normalized histograms
        hist1 = img1.histogram()  # 768 values (256 * 3 channels)
        hist2 = img2.histogram()

        # Normalize
        total1 = sum(hist1) or 1
        total2 = sum(hist2) or 1
        h1 = [v / total1 for v in hist1]
        h2 = [v / total2 for v in hist2]

        # Bhattacharyya coefficient (similarity)
        bc = sum(math.sqrt(a * b) for a, b in zip(h1, h2))
        
        # Convert to dissimilarity
        dissimilarity = 1.0 - min(1.0, bc)

        return round(dissimilarity, 4)

    except Exception as e:
        return 0.5  # uncertain


def compare_images_pixels(before_path: str, after_path: str) -> float:
    """
    Compare two images using pixel-level mean absolute difference.
    Returns change percentage (0.0 = identical, 1.0 = completely different).
    """
    try:
        img1 = Image.open(before_path).convert("RGB").resize((128, 128))
        img2 = Image.open(after_path).convert("RGB").resize((128, 128))

        px1 = list(img1.getdata())
        px2 = list(img2.getdata())

        total_diff = 0
        for p1, p2 in zip(px1, px2):
            for c1, c2 in zip(p1, p2):
                total_diff += abs(c1 - c2)

        max_diff = 255 * 3 * len(px1)
        change_pct = total_diff / max_diff

        return round(change_pct, 4)

    except Exception:
        return 0.5


def verify_resolution(before_path: str, after_path: str) -> dict:
    """
    Full verification pipeline.
    Compares before/after images and returns a confidence score
    that the issue has been resolved.
    
    Returns:
        dict with confidence (0-1), verdict, and details
    """
    if not os.path.exists(before_path):
        return {
            "confidence": 0.0,
            "verdict": "no_before_evidence",
            "message": "No 'before' evidence image found for comparison.",
        }

    if not os.path.exists(after_path):
        return {
            "confidence": 0.0,
            "verdict": "no_after_evidence",
            "message": "No 'after' evidence image provided.",
        }

    # Run both comparison methods
    hist_diff = compare_images_histogram(before_path, after_path)
    pixel_diff = compare_images_pixels(before_path, after_path)

    # Weighted average (histogram is more robust)
    combined_score = hist_diff * 0.6 + pixel_diff * 0.4

    # Map to resolution confidence
    # If images are very different → issue was likely fixed
    # If images are very similar → issue may still exist
    if combined_score > 0.3:
        confidence = min(0.98, 0.7 + combined_score * 0.3)
        verdict = "likely_resolved"
        message = f"Significant visual change detected ({confidence*100:.0f}% confidence). Issue appears resolved."
    elif combined_score > 0.15:
        confidence = 0.5 + combined_score
        verdict = "partial_change"
        message = f"Moderate visual change detected ({confidence*100:.0f}% confidence). Partial resolution possible."
    else:
        confidence = combined_score * 2
        verdict = "no_change"
        message = f"Minimal visual change detected ({confidence*100:.0f}% confidence). Issue may still exist."

    return {
        "confidence": round(confidence, 3),
        "verdict": verdict,
        "message": message,
        "details": {
            "histogram_dissimilarity": hist_diff,
            "pixel_change": pixel_diff,
            "combined_score": round(combined_score, 4),
        },
    }


def generate_mock_verification(has_real_before: bool = False) -> dict:
    """
    Generate a realistic verification result for demo purposes
    when we don't have actual before/after images.
    """
    import random
    confidence = round(random.uniform(0.82, 0.97), 3)
    return {
        "confidence": confidence,
        "verdict": "likely_resolved",
        "message": f"AI verification confidence: {confidence*100:.1f}%. Visual analysis indicates significant improvement.",
        "details": {
            "histogram_dissimilarity": round(random.uniform(0.3, 0.6), 4),
            "pixel_change": round(random.uniform(0.2, 0.5), 4),
            "combined_score": round(random.uniform(0.3, 0.55), 4),
        },
    }
