import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function testPdf() {
    try {
        console.log("Starting PDF test...");
        // Just checking if we can load the library and call getDocument
        // We don't even need a real PDF for this test if we just want to see if it crashes on import like pdf-parse
        console.log("pdfjs loaded");
    } catch (err) {
        console.error("Test failed", err);
    }
}

testPdf();
