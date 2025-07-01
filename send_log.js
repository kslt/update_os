require('dotenv').config();
const fs = require('fs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const path = require('path');

// === Skapa PDF ===
function generatePDF(logText, outputPath, totalLines, errorLines) {
    return new Promise((resolve, reject) => {
        console.log('🔧 Startar PDF-generering...');
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
        const stream = fs.createWriteStream(outputPath);

        stream.on('finish', () => {
            console.log('✅ PDF färdigskriven.');
            resolve();
        });
        stream.on('error', (err) => {
            console.error('❌ Fel i stream:', err);
            reject(err);
        });

        doc.pipe(stream);

        try {
            const now = new Date();
            const dateString = now.toLocaleString('sv-SE');
            const logoPath = 'logo.png';

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, doc.page.width / 2 - 50, 40, { width: 100 });
                doc.moveDown(3.5);
            } else {
                console.log('⚠️ Logotyp hittades inte.');
            }

            doc.fontSize(16).fillColor('#333333').font('Helvetica').text('vm210 - Uppdatering av server - Loggrapport', { align: 'center' });
            doc.fontSize(10).fillColor('#000000').font('Helvetica').text(`Genererad: ${dateString}`, { align: 'center' });
            doc.moveDown(1.5);

            doc.fontSize(12).fillColor('#000000').text(`Sammanfattning:`);
            doc.fontSize(10).text(`- Totalt antal rader: ${totalLines}`);
            doc.text(`- Antal rader med "ERROR": ${errorLines}`);
            doc.moveDown(3);

            doc.fillColor('#31708f').font('Helvetica-Bold').fontSize(12).text('Logg', doc.x + 5, doc.y - 15);
            doc.moveDown(1);
            doc.font('Courier').fontSize(9);
            writeLogWithHighlights(doc, logText || '(ingen data)');
            doc.moveDown(4);

            doc.end();
        } catch (e) {
            console.error('🚨 Fel under PDF-generering:', e);
            reject(e);
        }
    });
}

// === Markera ERROR-rader ===
function writeLogWithHighlights(doc, content) {
    const lines = content.split('\n');
    for (const line of lines) {
        if (/error/i.test(line)) {
            doc.fillColor('red').text(line, { lineGap: 1 });
        } else {
            doc.fillColor('black').text(line, { lineGap: 1 });
        }
    }
}

// === Main-körning ===
(async () => {
    console.log(`[${new Date().toISOString()}] Startar loggrapport...`);

    try {
        const updateLog = '/var/log/server-update.log';
        const updateContent = fs.readFileSync(updateLog, 'utf-8');

        const lines = updateContent.split('\n');
        const totalLines = lines.length;
        const errorLines = lines.filter(line => /error/i.test(line)).length;

        const pdfPath = `/tmp/server-update-log-${new Date().toISOString().slice(0, 10)}.pdf`;
        await generatePDF(updateContent, pdfPath, totalLines, errorLines);

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"vm210 - Serveruppdatering" <${process.env.SMTP_FROM_EMAIL}>`,
            to: process.env.SMTP_TO_EMAIL,
            subject: 'Daglig serveruppdatering - PDF-logg',
            text: 'Se bifogad PDF-fil med loggar från den senaste serveruppdateringen.',
            attachments: [
                {
                    filename: path.basename(pdfPath),
                    path: pdfPath,
                },
            ],
        });

        fs.unlinkSync(pdfPath);
        console.log('📧 PDF-logg skickad!');
    } catch (err) {
        console.error('❌ Fel vid logghantering eller e-postskick:', err);
    }
})();
