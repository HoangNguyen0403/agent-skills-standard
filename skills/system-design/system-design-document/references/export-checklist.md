# Architecture Document Export Checklist (DOCX & PDF)

Standards for generating client-ready `.docx` and `.pdf` deliverables from Markdown architecture documents without layout breakage, table clipping, or unreadable diagrams.

---

## 1. Table Formatting & python-docx XML Rules

Word rendering engines do not calculate dynamic column widths reliably across different page sizes and zoom factors. All generated tables must enforce explicit layout properties:

### A. Fixed Table Layout (`w:tblLayout`)
Disable Word's default autofit mechanism to prevent arbitrary table stretching or text truncation:

```python
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

# Set table layout to fixed
tblPr = table._tbl.tblPr
tblLayout = parse_xml(f'<w:tblLayout {nsdecls("w")} w:type="fixed"/>')
tblPr.append(tblLayout)
```

### B. Explicit Table Borders (`w:tblBorders`)
Ensure all borders (top, left, bottom, right, insideH, insideV) are clearly defined:

```python
tblBorders = parse_xml(f"""
    <w:tblBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        <w:left w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>
""")
tblPr.append(tblBorders)
```

### C. Content-Based Column Widths (`w:gridCol` & `w:tcW`)
Compute column widths from actual text content, with an absolute minimum width sized to accommodate the longest unbroken word in that column:

```python
from docx.shared import Inches

# Example: 3-column table with custom proportional widths
col_widths = [Inches(1.5), Inches(3.5), Inches(1.5)]
for row in table.rows:
    for idx, width in enumerate(col_widths):
        row.cells[idx].width = width

# Also write w:gridCol elements on table grid
tblGrid = parse_xml(f"""
    <w:tblGrid {nsdecls("w")}>
        <w:gridCol w:w="{int(col_widths[0].inches * 1440)}"/>
        <w:gridCol w:w="{int(col_widths[1].inches * 1440)}"/>
        <w:gridCol w:w="{int(col_widths[2].inches * 1440)}"/>
    </w:tblGrid>
""")
table._tbl.append(tblGrid)
```

### D. Repeat Header Row Across Pages (`w:tblHeader`)
Mark the header row so multi-page tables repeat column headings at the top of each page:

```python
header_tr = table.rows[0]._tr.get_or_add_trPr()
header_tr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
```

### E. Prevent Row Splitting Across Page Breaks (`w:cantSplit`)
Prevent table rows from being chopped in half across a page boundary:

```python
for row in table.rows:
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
```

---

## 2. Markdown Source Discipline

To ensure converters (e.g. pandoc, markdown-it, python-docx converters) parse documents cleanly:

1. **Blank line before every list**: Always precede every ordered (`1.`) and unordered (`-`) list with an empty line. Omitting the blank line causes list items to merge into adjacent table cells or paragraph blocks.
2. **Explicit table cell formatting**: Avoid unescaped pipe (`|`) characters inside table cell text; use code tags or HTML entities (`&#124;`) instead.
3. **Consistent heading hierarchy**: Use standard Markdown `#` through `####` without skipping levels.

---

## 3. Architecture Diagrams & Page Breaks

1. **Page break before tall diagrams**: When an HLD or sequence diagram is taller than approximately 400 pixels, insert a page break before the section heading to ensure the diagram does not break awkwardly across pages:
   ```markdown
   <div style="page-break-before: always;"></div>
   ```
   Or in python-docx: `document.add_page_break()`.
2. **Mermaid + PNG dual retention**: Always keep the Mermaid source code in the Markdown document directly alongside the rendered PNG image:
   ```markdown
   ![High-Level Design](assets/hld-v1.1.png)

   <details>
   <summary>Mermaid Diagram Source</summary>

   ```mermaid
   flowchart TD
     ...
   ```
   </details>
   ```
   This guarantees future maintainers can update the architecture without having to redraw it from scratch.

---

## 4. Visual Inspection Gate (Pre-Delivery)

Never deliver an exported `.docx` or `.pdf` without visual verification:

- [ ] Render the output file to PDF.
- [ ] Convert PDF pages to images or open in a viewer.
- [ ] Inspect every table:
  - [ ] No clipped words or awkward mid-word line wraps.
  - [ ] Header rows repeat properly on multi-page tables.
  - [ ] Borders appear crisp and consistent.
- [ ] Inspect every diagram:
  - [ ] Text in diagram boxes is sharp and completely legible.
  - [ ] Diagrams fit within page margins without truncation.
  - [ ] No orphaned diagram headings isolated at the bottom of a page.
