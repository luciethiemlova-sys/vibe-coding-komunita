const OLD_URL = "https://script.google.com/macros/s/AKfycbwCeKlMjJMk7dYXUzN1FY0xT4Kt3YVW3IJn1HjvmNJr8TUPHbCNsJfM59nbewZiMa2bHQ/exec";
const NEW_URL = "https://script.google.com/macros/s/AKfycbw1NxO4bK-Prxp6MCVU7pJ2XzxfHluRA2ogKMIuPd6NhJ4GF5g8hRzrQqUdx69_nm6RwQ/exec";

async function postRequest(action, data) {
    const response = await fetch(NEW_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...data }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
    });
    return response.json();
}

async function migrate() {
    console.log("Fetching old members...");
    const oldRes = await fetch(`${OLD_URL}?action=getmembers`);
    const members = await oldRes.json();
    
    console.log(`Found ${members.length} members. Migrating...`);
    
    for (const user of members) {
        console.log(`Migrating: ${user.id}`);
        // Login creates the user if missing
        await postRequest('login', { email: user.id });
        // Save profile updates their details
        if (user.name || user.bio) {
            await postRequest('saveprofile', { id: user.id, name: user.name, bio: user.bio });
        }
        // sleep a bit to not hammer Apps Script
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log("Migration complete!");
}

migrate().catch(console.error);
