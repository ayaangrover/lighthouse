require('./polyfill');

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { parseGrades, flattenGrades } = require('./parser');
const configModule = require('./config');

const GRADES_URL = 'https://schoology.harker.org/grades/grades';

const DATA_DIR = path.join(__dirname, 'data');
const COOKIE_FILE = path.join(DATA_DIR, 'cookie.txt');
const LAST_GRADES_FILE = path.join(DATA_DIR, 'lastGrades.json');
const DEBUG_HTML_FILE = path.join(__dirname, 'debug_response.html');

let config;
try {
    config = configModule.load();
} catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
}

const AUTH_WARNING_COOLDOWN_MS = 6 * 60 * 60 * 1000;
let lastAuthWarningAt = 0;

let checkInProgress = false;

async function sendNotification(title, message) {
    try {
        await axios.post(`https://ntfy.sh/${config.ntfyTopic}`, message, {
            headers: { 'Title': title, 'Priority': 'default' },
            timeout: 15000
        });
        console.log(`Notification sent: ${title} — ${message}`);
    } catch (err) {
        console.error('Failed to send notification:', err.message || String(err));
    }
}

function warnAuthExpired() {
    const now = Date.now();
    if (now - lastAuthWarningAt < AUTH_WARNING_COOLDOWN_MS) return;
    lastAuthWarningAt = now;
    sendNotification(
        'Lighthouse needs you to sign in',
        'It can\'t read your grades right now. Open schoology.harker.org in Chrome and log in — it will pick up again on its own.'
    );
}

async function checkGrades() {
    if (checkInProgress) return;
    checkInProgress = true;

    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            console.log('No cookie yet. Open schoology.harker.org in Chrome with the extension installed.');
            return;
        }
        const cookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim();

        const response = await axios.get(GRADES_URL, {
            headers: { 'Cookie': cookie },
            timeout: 15000
        });

        if (config.debugDumpHtml) {
            fs.writeFileSync(DEBUG_HTML_FILE, response.data);
        }

        const currentGradesRaw = parseGrades(response.data, config.ignoreCourses);
        const currentGradesFlat = flattenGrades(currentGradesRaw);

        if (Object.keys(currentGradesFlat).length === 0) {
            console.warn('Parsed 0 assignments — the session has probably expired.');
            warnAuthExpired();
            return;
        }

        lastAuthWarningAt = 0;

        let previousGradesFlat;
        if (fs.existsSync(LAST_GRADES_FILE)) {
            try {
                const raw = fs.readFileSync(LAST_GRADES_FILE, 'utf8').trim();
                if (!raw) throw new Error('file is empty');
                previousGradesFlat = JSON.parse(raw);
            } catch (e) {
                console.error('lastGrades.json unreadable, resetting baseline:', e.message);
                previousGradesFlat = null;
            }
        } else {
            previousGradesFlat = null;
        }

        if (!previousGradesFlat) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            fs.writeFileSync(LAST_GRADES_FILE, JSON.stringify(currentGradesFlat, null, 2));
            const count = Object.keys(currentGradesFlat).length;
            console.log(`First run — recorded ${count} existing grades as the baseline. Watching for changes from here.`);
            return;
        }

        let changesCount = 0;

        for (const key of Object.keys(currentGradesFlat)) {
            const current = currentGradesFlat[key];
            const previous = previousGradesFlat[key];

            if (!current.score || current.score.trim() === '') continue;

            if (!previous) {
                changesCount++;
                await sendNotification(
                    `New grade in ${current.courseName}`,
                    `${current.assignmentName}: ${current.score}`
                );
            } else if (previous.score !== current.score) {
                changesCount++;
                await sendNotification(
                    `Grade changed in ${current.courseName}`,
                    `${current.assignmentName}: ${previous.score} → ${current.score}`
                );
            }
        }

        console.log(
            changesCount === 0
                ? `No changes (${Object.keys(currentGradesFlat).length} grades tracked).`
                : `Sent ${changesCount} notification(s).`
        );

        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(LAST_GRADES_FILE, JSON.stringify(currentGradesFlat, null, 2));

    } catch (error) {
        console.error('Error checking grades:', error.message || String(error));
    } finally {
        checkInProgress = false;
    }
}

const app = express();
app.use(express.json({ limit: '64kb' }));

app.post('/api/cookie', (req, res) => {
    const { cookie } = req.body || {};

    if (!cookie || typeof cookie !== 'string') {
        return res.status(400).json({ error: 'No cookie provided' });
    }
    if (cookie.length > 8192) {
        return res.status(413).json({ error: 'Cookie too large' });
    }
    if (!/(^|[;\s])SESS[0-9a-f]*=/.test(cookie)) {
        return res.status(400).json({ error: 'Not a Schoology session cookie' });
    }

    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });

        const existing = fs.existsSync(COOKIE_FILE)
            ? fs.readFileSync(COOKIE_FILE, 'utf8').trim()
            : null;

        if (existing === cookie.trim()) {
            return res.json({ success: true, message: 'Cookie unchanged' });
        }

        fs.writeFileSync(COOKIE_FILE, cookie.trim(), 'utf8');
        console.log('Session cookie updated.');

        checkGrades();

        res.json({ success: true, message: 'Cookie updated' });
    } catch (error) {
        console.error('Error saving cookie:', error.message);
        res.status(500).json({ error: 'Failed to save cookie' });
    }
});

const pollMs = config.pollMinutes * 60 * 1000;
setInterval(checkGrades, pollMs);
checkGrades();

app.listen(config.port, '127.0.0.1', () => {
    console.log(`Lighthouse is running. Checking grades every ${config.pollMinutes} minutes.`);
    console.log(`Listening on http://127.0.0.1:${config.port} for the Chrome extension.`);
});
