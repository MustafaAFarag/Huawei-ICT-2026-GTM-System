"""Execution CSV and dependency-free OOXML workbook exports."""
import csv
import io
import zipfile
from xml.sax.saxutils import escape

def safe(value):
    text=str(value if value is not None else '')
    return "'"+text if text.lstrip().startswith(('=','+','-','@')) else text

def csv_bytes(rows):
    out=io.StringIO(newline='')
    if rows:
        writer=csv.DictWriter(out,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows({k:safe(v) for k,v in r.items()} for r in rows)
    return b'\xef\xbb\xbf'+out.getvalue().encode('utf-8')

def column(n):
    value=''
    while n:
        n,r=divmod(n-1,26)
        value=chr(65+r)+value
    return value

def xlsx_bytes(rows):
    entries=[]
    if rows:
        for ri,row in enumerate([list(rows[0]),*[list(r.values()) for r in rows]],1):
            cells=''.join(f'<c r="{column(ci)}{ri}" t="inlineStr"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>' for ci,v in enumerate(row,1))
            entries.append(f'<row r="{ri}">{cells}</row>')
    files={
        '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Campaign preparation" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(entries)+'</sheetData></worksheet>'}
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,text in files.items(): archive.writestr(name,'<?xml version="1.0" encoding="UTF-8"?>'+text)
    return buffer.getvalue()
