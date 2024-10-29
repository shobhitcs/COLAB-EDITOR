const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');


const MAX_OUTPUT_LENGTH = 500;
const TIMEOUT = 5000;

// async function executeCode(code, language) {
//     const fileName = crypto.randomBytes(16).toString('hex');
//     const ext = language === 'py' ? '.py' : '.js';
//     const filePath = path.join('/tmp', fileName + ext);

//     try {
//         await fs.writeFile(filePath, code);

//         return new Promise((resolve, reject) => {
//             let output = '';
//             let errorOutput = '';

//             const process = language === 'py'
//                 ? spawn('python3', [filePath])
//                 : spawn('node', [filePath]);

//             const timeoutId = setTimeout(() => {
//                 process.kill();
//                 reject(new Error('Execution timeout'));
//             }, TIMEOUT);

//             process.stdout.on('data', (data) => {
//                 output += data.toString();
//                 if (output.length > MAX_OUTPUT_LENGTH) {
//                     process.kill();
//                     reject(new Error('Output too long'));
//                 }
//             });

//             process.stderr.on('data', (data) => {
//                 errorOutput += data.toString();
//             });

//             process.on('close', (code) => {
//                 clearTimeout(timeoutId);
//                 if (code !== 0) {
//                     reject(new Error(errorOutput || 'Execution failed'));
//                 } else {
//                     resolve(output);
//                 }
//             });

//             process.on('error', reject);
//         });
//     } finally {
//         try {
//             await fs.unlink(filePath);
//         } catch (err) {
//             console.error('Failed to delete temp file:', err);
//         }
//     }
// }
router.post('/run', async (req, res) => {
    const { code, language } = req.body;
    console.log(code,language);
    //Add main code here

    // // Validate inputs
    // if (!code || !language) {
    //     return res.status(400).json({ error: 'Missing code or language' });
    // }

    // if (!['py', 'js'].includes(language)) {
    //     return res.status(400).json({ error: 'Language must be py or js' });
    // }

    // try {
    //     const output = await executeCode(code, language);

    //     // If output is too long
    //     if (output.length > MAX_OUTPUT_LENGTH) {
    //         return res.status(400).json({
    //             error: `Output exceeds ${MAX_OUTPUT_LENGTH} characters`
    //         });
    //     }

    //     return res.json({ output });
    // } catch (error) {
    //     if (error.message === 'Output too long') {
    //         return res.status(400).json({
    //             error: `Output exceeds ${MAX_OUTPUT_LENGTH} characters`
    //         });
    //     }
    //     if (error.message === 'Execution timeout') {
    //         return res.status(400).json({
    //             error: 'Code execution timed out'
    //         });
    //     }

    //     return res.status(500).json({
    //         error: 'Execution failed',
    //         details: error.message
    //     });
    // }
});

module.exports = router;