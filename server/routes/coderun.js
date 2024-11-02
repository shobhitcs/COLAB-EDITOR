const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const MAX_OUTPUT_LENGTH = 500;
const TIMEOUT = 5000;

const auth = require('../middleware/auth');

async function executeCode(code, language) {
    const fileName = crypto.randomBytes(16).toString('hex');
    const ext = language === 'py' ? '.py' : '.js';
    const tempDir = path.resolve(__dirname, '../temp');
    const filePath = path.join(tempDir, fileName + ext);

    try {
        await fs.mkdir(tempDir, { recursive: true });
        console.log(`Temp directory confirmed: ${tempDir}`);

        try {
            await fs.writeFile(filePath, code);
            console.log(`File created at ${filePath}`);
        } catch (writeErr) {
            console.error(`Failed to write to file at ${filePath}`, writeErr);
            throw new Error('File write failed');
        }

        try {
            await fs.access(filePath);
            console.log(`File access confirmed: ${filePath}`);
        } catch (accessErr) {
            console.error(`File at ${filePath} could not be accessed`);
            throw new Error('File access failed');
        }

        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            const process = language === 'py'
                ? spawn('python', [filePath])
                : spawn('node', [filePath]);

            const timeoutId = setTimeout(() => {
                process.kill();
                reject(new Error('Execution timeout'));
            }, TIMEOUT);

            process.stdout.on('data', (data) => {
                output += data.toString();
                if (output.length > MAX_OUTPUT_LENGTH) {
                    process.kill();
                    reject(new Error('Output too long'));
                }
            });

            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', async (code) => {
                clearTimeout(timeoutId);
                try {
                    await fs.unlink(filePath);
                    console.log(`File at ${filePath} deleted.`);
                } catch (err) {
                    console.error('Failed to delete temp file:', err);
                }

                if (code !== 0) {
                    reject(new Error(errorOutput || 'Execution failed'));
                } else {
                    resolve(output);
                }
            });

            process.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    } catch (error) {
        console.error('Execution error:', error);
        throw error;
    }
}


router.post('/run', async (req, res) => {
    const { code, language } = req.body;
    console.log('Executing code:', { language, codeLength: code?.length });

    if (!code || !language) {
        return res.status(400).json({ error: 'Missing code or language' });
    }

    if (!['py', 'js'].includes(language)) {
        return res.status(400).json({ error: 'Language must be py or js' });
    }

    try {
        const output = await executeCode(code, language);

        // If output is too long
        if (output.length > MAX_OUTPUT_LENGTH) {
            return res.status(400).json({
                error: `Output exceeds ${MAX_OUTPUT_LENGTH} characters`
            });
        }

        return res.json({ output });
    } catch (error) {
        console.error('Code execution error:', error);

        if (error.message === 'Output too long') {
            return res.status(400).json({
                error: `Output exceeds ${MAX_OUTPUT_LENGTH} characters`
            });
        }
        if (error.message === 'Execution timeout') {
            return res.status(400).json({
                error: 'Code execution timed out'
            });
        }

        return res.status(500).json({
            error: 'Execution failed',
            details: error.message
        });
    }
});

module.exports = router;