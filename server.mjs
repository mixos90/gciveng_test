import 'dotenv/config';
import express from 'express';
import { createTransport } from 'nodemailer';
import bodyParser from 'body-parser';
import { writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import * as XLSX from 'xlsx'; // Import the xlsx library

// Define __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint to fetch questions and scores from the Excel file
app.get('/questions', (req, res) => {
  try {
    const workbook = XLSX.readFile('path/to/your/excel-file.xlsx'); // Replace with the path to your Excel file
    const sheetName = workbook.SheetNames[0]; // Assuming questions are on the first sheet
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Extract questions ("ΚΡΙΤΗΡΙΑ") and scores ("ΜΟΡΙΑ")
    const questionsWithScores = worksheet.map((row) => ({
      question: row['ΚΡΙΤΗΡΙΑ'],
      score: row['ΜΟΡΙΑ'],
    }));

    res.json(questionsWithScores); // Send the questions and scores to the front-end
  } catch (error) {
    console.error('Error fetching questions from Excel:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

app.post('/submit-form', async (req, res) => {
  try {
    console.log('Received form data:', req.body);

    const { userInfo, questions, answers, totalScore } = req.body;

    // Create the Excel workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];

    // Add contact information to the worksheet
    worksheetData.push(['Ονοματεπώνυμο', userInfo.fullName]);
    worksheetData.push(['Εταιρία', userInfo.companyName]);
    worksheetData.push(['Email', userInfo.email]);

    // Add a blank row to separate the contact info from the questions
    worksheetData.push([]);

    // Add table headers
    worksheetData.push(['Ερώτηση', 'Απάντηση', 'Μόρια']);
    
    // Add the questions, answers, and scores to the worksheet
    questions.forEach((questionObj, index) => {
      worksheetData.push([
        questionObj.question,
        answers[index] || 'Δεν απαντήθηκε', // "Not answered" in Greek
        questionObj.score,
      ]);
    });

    // Add total score to the worksheet
    worksheetData.push([]);
    worksheetData.push(['Συνολική Βαθμολογία', totalScore]); // "Total Score" in Greek

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Form Data');

    // Set styles for the header
    const headerCellStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FFFF00' } }, // Yellow background
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Apply styles to headers
    const range = XLSX.utils.decode_range(worksheet['!ref']); // Get the range of the worksheet
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Header row is 0
      if (!worksheet[cellAddress]) continue; // Skip if the cell does not exist
      worksheet[cellAddress].s = headerCellStyle; // Apply header styles
    }

    // Set column widths for better readability
    const columnWidths = [
      { wch: 40 }, // Question column
      { wch: 20 }, // Answer column
      { wch: 10 }, // Score column
    ];
    worksheet['!cols'] = columnWidths;

    const filePath = join(__dirname, `${userInfo.fullName}_${userInfo.companyName}.xlsx`);
    console.log('File path:', filePath);

    // Write the Excel file to disk
    XLSX.writeFile(workbook, filePath);

    // Define mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'michalis_sym@hotmail.com, gkazanas@gkciveng.com',
      subject: 'Νέα φόρμα δημιουργήθηκε',
      text: 'Η φόρμα είναι συννημένη στο email',
      attachments: [
        {
          filename: `${userInfo.fullName}_${userInfo.companyName}.xlsx`,
          path: filePath,
        },
      ],
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, error: error.toString() });
      }
      unlinkSync(filePath); // Clean up
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error processing form submission:', error);
    res.status(500).json({ success: false, error: error.toString() });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
