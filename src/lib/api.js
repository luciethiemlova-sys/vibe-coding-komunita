const API_URL = String(import.meta.env.VITE_API_URL || "").trim();

async function request(action, data = {}, method = 'GET') {
    if (!API_URL) {
        console.error('API_URL is missing! Set VITE_API_URL in .env');
        return null;
    }

    try {
        if (method === 'GET') {
            const params = new URLSearchParams({ action, ...data });
            const response = await fetch(`${API_URL}?${params.toString()}`);
            return await response.json();
        } else {
            const response = await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script requires no-cors sometimes for POST, but it returns opaque responses
                body: JSON.stringify({ action, ...data })
            });
            // For POST with no-cors, we can't read the response. 
            // We'll assume success or use a different strategy if needed.
            return { success: true };
        }
    } catch (err) {
        console.error(`API Error (${action}):`, err);
        throw err;
    }
}

// Improved POST for Apps Script (using GET with params if small, or form-data)
async function postRequest(action, data = {}) {
    // Apps Script is tricky with CORS and POST. 
    // A common workaround is to use fetch with redirect: 'follow'
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...data }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            return { success: false, error: `HTTP Error: ${response.status}` };
        }

        const result = await response.json();
        return result;
    } catch (err) {
        console.error(`POST Error (${action}):`, err);
        return { success: false, error: err.message };
    }
}

export const api = {
    login: (email) => postRequest('login', { email }),
    getEvent: () => request('getEvent'),
    getTopics: (eventId) => request('getTopics', { eventId }),
    getDateOptions: (eventId) => request('getDateOptions', { eventId }),
    addTopic: (eventId, text, authorId) => postRequest('addTopic', { eventId, text, authorId }),
    toggleTopicVote: (topicId, profileId) => postRequest('toggleTopicVote', { topicId, profileId }),
    toggleDateVote: (optionId, profileId) => postRequest('toggleDateVote', { optionId, profileId }),
    saveProfile: (id, name, bio) => postRequest('saveProfile', { id, name, bio }),
    getEvents: () => request('getEvents'),
    createEvent: (eventData) => postRequest('createEvent', eventData),
    getMembers: () => request('getMembers'),
    getDiagnostics: () => request('diagnostics'),
};
