"""PDF merger for combining generated plots into a single document

This module provides functionality to merge multiple PDF files into a single
multi-page document, organized by subdirectory with bookmarks for navigation.
"""

import os
import logging
from pathlib import Path

log = logging.getLogger(__name__)


def merge_pdfs(output_dir, output_name='all_plots.pdf', enabled=True):
    """Merge all PDF files in output_dir into a single multi-page PDF

    Collects all PDF files from the output directory and its subdirectories,
    organizes them by directory, and creates a merged PDF with bookmarks
    for each section.

    Parameters
    ----------
    output_dir : str
        Directory containing PDF files to merge
    output_name : str
        Name of the merged output PDF file (default: 'all_plots.pdf')
    enabled : bool
        If False, skip merging entirely (default: True)

    Returns
    -------
    str or None
        Path to merged PDF if successful, None if skipped or failed
    """
    if not enabled:
        log.debug('PDF merging disabled, skipping')
        return None

    try:
        from pypdf import PdfWriter
    except ImportError:
        log.warning(
            'pypdf not installed, skipping PDF merge. '
            'Install with: pip install pypdf'
        )
        return None

    output_path = Path(output_dir)
    if not output_path.exists():
        log.warning(f'Output directory {output_dir} does not exist')
        return None

    # Collect all PDF files, organized by subdirectory
    pdf_files_by_dir = {}

    for pdf_path in sorted(output_path.rglob('*.pdf')):
        # Skip the merged output file itself
        if pdf_path.name == output_name:
            continue

        # Get relative directory path
        rel_path = pdf_path.relative_to(output_path)
        if len(rel_path.parts) > 1:
            # File is in a subdirectory
            subdir = str(rel_path.parent)
        else:
            # File is in root output directory
            subdir = '.'

        if subdir not in pdf_files_by_dir:
            pdf_files_by_dir[subdir] = []
        pdf_files_by_dir[subdir].append(pdf_path)

    if not pdf_files_by_dir:
        log.info('No PDF files found to merge')
        return None

    # Count total files
    total_files = sum(len(files) for files in pdf_files_by_dir.values())
    log.info(f'Merging {total_files} PDF files from {len(pdf_files_by_dir)} directories')

    # Create merged PDF with bookmarks
    writer = PdfWriter()

    # Sort directories for consistent ordering
    sorted_dirs = sorted(pdf_files_by_dir.keys())

    for subdir in sorted_dirs:
        pdf_files = sorted(pdf_files_by_dir[subdir])

        # Create section bookmark for this directory
        section_name = subdir if subdir != '.' else 'Root'
        section_bookmark = None

        for i, pdf_path in enumerate(pdf_files):
            try:
                # Get current page count before adding
                page_before = len(writer.pages)

                # Add all pages from this PDF
                writer.append(str(pdf_path))

                # Add bookmark for the first page of this PDF
                page_after = len(writer.pages)
                if page_after > page_before:
                    # Create section bookmark on first file of each directory
                    if section_bookmark is None:
                        section_bookmark = writer.add_outline_item(
                            section_name,
                            page_before,
                            bold=True
                        )

                    # Add individual file bookmark under section
                    file_label = pdf_path.stem  # filename without extension
                    writer.add_outline_item(
                        file_label,
                        page_before,
                        parent=section_bookmark
                    )

                log.debug(f'Added {pdf_path.name}')

            except Exception as e:
                log.warning(f'Failed to add {pdf_path}: {e}')
                continue

    if len(writer.pages) == 0:
        log.warning('No pages added to merged PDF')
        return None

    # Write merged PDF
    merged_path = output_path / output_name
    try:
        with open(merged_path, 'wb') as f:
            writer.write(f)
        log.info(f'Created merged PDF: {merged_path} ({len(writer.pages)} pages)')
        return str(merged_path)
    except Exception as e:
        log.error(f'Failed to write merged PDF: {e}')
        return None


def merge_pdfs_by_system(output_dir, systems, output_name='all_plots.pdf', enabled=True):
    """Merge PDFs organized by plotter system names

    Similar to merge_pdfs but uses system names as bookmark sections
    instead of directory structure.

    Parameters
    ----------
    output_dir : str
        Directory containing PDF files
    systems : list of str
        List of system names that were plotted (used for bookmark organization)
    output_name : str
        Name of merged output file
    enabled : bool
        If False, skip merging

    Returns
    -------
    str or None
        Path to merged PDF if successful
    """
    if not enabled:
        return None

    try:
        from pypdf import PdfWriter
    except ImportError:
        log.warning('pypdf not installed, skipping PDF merge')
        return None

    output_path = Path(output_dir)
    if not output_path.exists():
        return None

    # Collect PDFs and try to match to systems
    all_pdfs = sorted(output_path.rglob('*.pdf'))
    all_pdfs = [p for p in all_pdfs if p.name != output_name]

    if not all_pdfs:
        log.info('No PDF files found to merge')
        return None

    # Group PDFs by system based on filename patterns
    pdf_by_system = {sys: [] for sys in systems}
    pdf_by_system['other'] = []

    for pdf_path in all_pdfs:
        matched = False
        for sys in systems:
            # Extract the function name from system (e.g., 'ecal.basic' -> 'basic')
            sys_short = sys.split('.')[-1] if '.' in sys else sys
            if sys_short.lower() in pdf_path.stem.lower():
                pdf_by_system[sys].append(pdf_path)
                matched = True
                break
        if not matched:
            pdf_by_system['other'].append(pdf_path)

    # Create merged PDF
    writer = PdfWriter()

    for sys in systems + ['other']:
        pdfs = pdf_by_system.get(sys, [])
        if not pdfs:
            continue

        section_bookmark = None
        for pdf_path in sorted(pdfs):
            try:
                page_before = len(writer.pages)
                writer.append(str(pdf_path))
                page_after = len(writer.pages)

                if page_after > page_before:
                    if section_bookmark is None:
                        section_bookmark = writer.add_outline_item(
                            sys.replace('.', ' / '),
                            page_before,
                            bold=True
                        )
                    writer.add_outline_item(
                        pdf_path.stem,
                        page_before,
                        parent=section_bookmark
                    )
            except Exception as e:
                log.warning(f'Failed to add {pdf_path}: {e}')

    if len(writer.pages) == 0:
        return None

    merged_path = output_path / output_name
    try:
        with open(merged_path, 'wb') as f:
            writer.write(f)
        log.info(f'Created merged PDF: {merged_path} ({len(writer.pages)} pages)')
        return str(merged_path)
    except Exception as e:
        log.error(f'Failed to write merged PDF: {e}')
        return None
