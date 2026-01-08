#!/usr/bin/env python3
"""Helper script to merge comparison PDFs.

This script is called from run_bertini_comparison.sh to avoid
bash escaping issues with inline Python code.

Usage:
    python3 merge_comparison_pdfs.py <plots_dir> <output_name> <ldmx_sw_path>
"""

import sys
import os


def main():
    if len(sys.argv) < 4:
        print("Usage: merge_comparison_pdfs.py <plots_dir> <output_name> <ldmx_sw_path>")
        sys.exit(1)

    plots_dir = sys.argv[1]
    output_name = sys.argv[2]
    ldmx_sw_path = sys.argv[3]

    # Add ldmx-sw to path for ComparePlots import
    sys.path.insert(0, ldmx_sw_path)

    try:
        from ComparePlots import merge_pdfs
        result = merge_pdfs(plots_dir, output_name=output_name)
        if result:
            print("Created merged PDF: {}".format(result))
        else:
            print("No PDFs to merge or merge failed")
    except ImportError as e:
        print("ComparePlots not available: {}".format(e))
        print("Skipping PDF merge")
    except Exception as e:
        print("PDF merge failed: {}".format(e))


if __name__ == "__main__":
    main()
