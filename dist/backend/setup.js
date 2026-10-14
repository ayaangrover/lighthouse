require('./polyfill');

const crypto = require('crypto');
const readline = require('readline');
const axios = require('axios');
const config = require('./config');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, a => resolve(a.trim())));

function generateTopic() {
    return 'lighthouse-' + crypto.randomBytes(24).toString('base64url');
}

async function main() {
    console.log('\n=== Lighthouse setup ===\n');

    if (config.exists()) {
        console.log(`You already have a config at ${config.configPath()}`);
        const again = await ask('Start over with a new notification topic? (y/N) ');
        if (again.toLowerCase() !== 'y') {
            console.log('Keeping your existing setup. Nothing changed.');
            rl.close();
            return;
        }
    }

    const settings = { ...config.DEFAULTS, ntfyTopic: generateTopic() };
    config.save(settings);

    console.log('\nYour private notification topic is:\n');
    console.log(`    ${settings.ntfyTopic}\n`);
    console.log('Keep it to yourself — anyone with this name can read your grade alerts.\n');
    console.log('Now set up your phone:');
    console.log('  1. Install "ntfy" from the App Store, Play Store, or F-Droid.');
    console.log('  2. Open it and tap the + button to subscribe to a topic.');
    console.log('  3. Paste the topic name above. Leave the server as ntfy.sh.\n');

    await ask('Press Enter once you have subscribed on your phone... ');

    console.log('\nSending a test notification...');
    try {
        await axios.post(`https://ntfy.sh/${settings.ntfyTopic}`,
            'If you can read this, notifications are working.',
            { headers: { Title: 'Lighthouse is set up' }, timeout: 15000 });
    } catch (err) {
        console.error(`\nCouldn't reach ntfy.sh: ${err.message}`);
        console.error('Check your internet connection and run "npm run setup" again.');
        rl.close();
        process.exitCode = 1;
        return;
    }

    const got = await ask('Did it arrive on your phone? (y/N) ');
    if (got.toLowerCase() !== 'y') {
        console.log('\nNo notification means the subscription did not take.');
        console.log('Check that the topic in the ntfy app matches exactly, then run "npm run setup" again.');
        rl.close();
        process.exitCode = 1;
        return;
    }

    console.log(`\nSaved to ${config.configPath()}`);
    console.log('\nTwo things left:');
    console.log('  1. Install the Chrome extension (see the README).');
    console.log('  2. Run "npm start", then open schoology.harker.org and log in.\n');
    rl.close();
}

main().catch(err => {
    console.error(err);
    rl.close();
    process.exitCode = 1;
});
