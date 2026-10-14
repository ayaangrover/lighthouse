const LIGHTHOUSE_URL = 'http://127.0.0.1:3412/api/cookie';

function setStatus(ok, detail) {
    chrome.action.setBadgeText({ text: ok ? 'OK' : '!' });
    chrome.action.setBadgeBackgroundColor({ color: ok ? '#16A34A' : '#DC2626' });
    chrome.action.setTitle({
        title: ok
            ? `Lighthouse: synced ${new Date().toLocaleTimeString()}`
            : `Lighthouse: ${detail}`
    });
}

chrome.webNavigation.onCompleted.addListener(
    async (details) => {
        if (details.frameId !== 0) return;

        try {
            const cookies = await chrome.cookies.getAll({ url: 'https://schoology.harker.org' });

            if (!cookies || cookies.length === 0) {
                setStatus(false, 'no Schoology cookies found — try logging in again');
                return;
            }

            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

            const response = await fetch(LIGHTHOUSE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookie: cookieString })
            });

            if (response.ok) {
                setStatus(true);
            } else {
                setStatus(false, `app returned ${response.status}`);
            }
        } catch (err) {
            setStatus(false, 'app not running on this computer — start it and reload this page');
        }
    },
    {
        url: [{ hostSuffix: 'schoology.harker.org' }]
    }
);
