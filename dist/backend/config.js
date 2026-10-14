const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULTS = {
    pollMinutes: 5,
    port: 3412,
    ignoreCourses: ['Advisory'],
    debugDumpHtml: false
};

const MIN_POLL_MINUTES = 2;

function configPath() {
    return CONFIG_FILE;
}

function exists() {
    return fs.existsSync(CONFIG_FILE);
}

function save(config) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function load() {
    if (!exists()) {
        throw new Error(
            `No config found at ${CONFIG_FILE}\n` +
            `Run "npm run setup" first — it generates your private ntfy topic.`
        );
    }

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
        throw new Error(`config.json is not valid JSON (${e.message}). Delete it and re-run "npm run setup".`);
    }

    const config = { ...DEFAULTS, ...raw };

    if (!config.ntfyTopic || typeof config.ntfyTopic !== 'string') {
        throw new Error('config.json is missing "ntfyTopic". Re-run "npm run setup".');
    }

    if (config.pollMinutes < MIN_POLL_MINUTES) {
        console.warn(`pollMinutes of ${config.pollMinutes} is too aggressive; using ${MIN_POLL_MINUTES}.`);
        config.pollMinutes = MIN_POLL_MINUTES;
    }

    if (!Array.isArray(config.ignoreCourses)) config.ignoreCourses = DEFAULTS.ignoreCourses;

    return config;
}

module.exports = { load, save, exists, configPath, DEFAULTS, DATA_DIR };
