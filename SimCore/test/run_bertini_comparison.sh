#!/bin/bash
#
# Run Bertini cascade history kaon biasing comparison test
#
# This script runs the photonuclear simulation with BertiniWithHistoryModel:
# 1. Without kaon biasing (baseline)
# 2. With kaon biasing (rejection sampling to enhance kaon production)
#
# The comparison shows how kaon biasing affects the physics distributions
# and verifies the weight propagation is working correctly.
#
# Usage:
#   ./run_bertini_comparison.sh [num_events] [run_number] [bias_factor]
#
# Default: 100 events, run 1, bias factor 10

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NUM_EVENTS="${1:-100}"
RUN_NUMBER="${2:-1}"
BIAS_FACTOR="${3:-10}"

echo "=============================================="
echo "Bertini Kaon Biasing Comparison Test"
echo "=============================================="
echo "Events per run: ${NUM_EVENTS}"
echo "Run number: ${RUN_NUMBER}"
echo "Kaon bias factor: ${BIAS_FACTOR}x"
echo ""

# Create output directory in current working directory (not source tree)
OUTPUT_DIR="${PWD}/bertini_kaon_bias_comparison"
mkdir -p "${OUTPUT_DIR}"
cd "${OUTPUT_DIR}"
echo "Output directory: ${OUTPUT_DIR}"
echo ""


# Run with kaon biasing
echo ""
echo "----------------------------------------------"
echo "Running WITH kaon biasing (${BIAS_FACTOR}x)..."
echo "----------------------------------------------"
denv fire "${SCRIPT_DIR}/bertini_history_test.py" \
    --with-kaon-biasing \
    --kaon-bias-factor "${BIAS_FACTOR}" \
    --num-events "${NUM_EVENTS}" \
    --run "${RUN_NUMBER}" \
    2>&1 | tee run_kaon_bias.log

# Run without kaon biasing (baseline)
echo "----------------------------------------------"
echo "Running WITHOUT kaon biasing (baseline)..."
echo "----------------------------------------------"
denv fire "${SCRIPT_DIR}/bertini_history_test.py" \
    --num-events "${NUM_EVENTS}" \
    --run "${RUN_NUMBER}" \
    2>&1 | tee run_no_bias.log
# Compare histograms
echo ""
echo "----------------------------------------------"
echo "Comparing histograms..."
echo "----------------------------------------------"

# Use the validation compare script
COMPARE_SCRIPT="${SCRIPT_DIR}/../../.github/actions/validate/compare.py"

if [[ -f "${COMPARE_SCRIPT}" ]]; then
    # Use labels without spaces to avoid quoting issues with denv
    denv python3 "${COMPARE_SCRIPT}" \
        hist_no_bias.root NoBias \
        "hist_kaon_bias_${BIAS_FACTOR}x.root" "KaonBias${BIAS_FACTOR}x" \
        2>&1 | tee comparison.log

    echo ""
    echo "=============================================="
    echo "Comparison complete!"
    echo "=============================================="
    echo ""
    echo "Output files in: ${OUTPUT_DIR}"
    echo "  - hist_no_bias.root           (baseline - no kaon biasing)"
    echo "  - hist_kaon_bias_${BIAS_FACTOR}x.root  (with ${BIAS_FACTOR}x kaon biasing)"
    echo "  - plots/pass/                 (matching histograms)"
    echo "  - plots/fail/                 (differing histograms)"
    echo ""

    # Count pass/fail
    PASS_COUNT=$(ls -1 plots/pass/*.pdf 2>/dev/null | wc -l || echo 0)
    FAIL_COUNT=$(ls -1 plots/fail/*.pdf 2>/dev/null | wc -l || echo 0)
    UNIQUE_COUNT=$(ls -1 plots/unique/*.pdf 2>/dev/null | wc -l || echo 0)

    echo "Results: ${PASS_COUNT} passed, ${FAIL_COUNT} failed, ${UNIQUE_COUNT} unique"
    echo ""
    echo "NOTE: With kaon biasing, expect differences in kaon-related histograms!"
    echo "      The biased sample should show enhanced kaon production."
    echo "      Check that the event weights are properly recorded."

    # Merge all PDFs into a single document with bookmarks
    if [[ -f "${SCRIPT_DIR}/merge_comparison_pdfs.py" ]]; then
        echo ""
        echo "----------------------------------------------"
        echo "Merging PDFs..."
        echo "----------------------------------------------"
        denv python3 "${SCRIPT_DIR}/merge_comparison_pdfs.py" plots comparison_report.pdf "${SCRIPT_DIR}/../.."
    fi

    # Note: We expect differences with kaon biasing, so don't fail on FAIL_COUNT > 0
    # Instead, just report the results
else
    echo "Compare script not found at: ${COMPARE_SCRIPT}"
    echo "Skipping histogram comparison."
    echo ""
    echo "To compare manually, run:"
    echo "  python3 compare.py hist_no_bias.root NoBias hist_kaon_bias_${BIAS_FACTOR}x.root KaonBias${BIAS_FACTOR}x"
fi

echo ""
echo "----------------------------------------------"
echo "Analyzing kaon production..."
echo "----------------------------------------------"

# Simple analysis of kaon production rates
cat << 'EOF' > analyze_kaons.py
#!/usr/bin/env python3
"""Quick analysis of kaon production in the two samples."""

import ROOT
import sys

def count_kaons_in_file(filename, label):
    """Count kaon-related quantities from DQM histograms."""
    f = ROOT.TFile.Open(filename, "READ")
    if not f or f.IsZombie():
        print(f"  {label}: Could not open {filename}")
        return None

    results = {}

    # Try to get kaon-related histograms from PhotoNuclearDQM
    # These might be named differently - adjust as needed
    hist_names = [
        "PhotoNuclearDQM/PhotoNuclearDQM_hardestPdgCode",
        "PhotoNuclearDQM/PhotoNuclearDQM_eventType",
    ]

    for name in hist_names:
        h = f.Get(name)
        if h:
            results[name.split("/")[-1]] = h.GetEntries()

    # Also check event weights
    h_weight = f.Get("PhotoNuclearDQM/PhotoNuclearDQM_eventWeight")
    if h_weight:
        results["mean_weight"] = h_weight.GetMean()
        results["weight_entries"] = h_weight.GetEntries()

    f.Close()
    return results

if __name__ == "__main__":
    print("\nKaon Production Analysis")
    print("=" * 50)

    # Analyze no-bias sample
    results_no_bias = count_kaons_in_file("hist_no_bias.root", "No Bias")
    if results_no_bias:
        print("\nNo Bias Sample:")
        for k, v in results_no_bias.items():
            print(f"  {k}: {v}")

    # Analyze biased sample (try to find the file)
    import glob
    biased_files = glob.glob("hist_kaon_bias_*.root")
    for bf in biased_files:
        results_biased = count_kaons_in_file(bf, "Kaon Biased")
        if results_biased:
            print(f"\nKaon Biased Sample ({bf}):")
            for k, v in results_biased.items():
                print(f"  {k}: {v}")

    print("\n" + "=" * 50)
    print("Note: Check the comparison plots for detailed distributions.")
EOF

denv python3 analyze_kaons.py 2>/dev/null || echo "  (Analysis script requires ROOT)"
rm -f analyze_kaons.py

echo ""
echo "Done!"
