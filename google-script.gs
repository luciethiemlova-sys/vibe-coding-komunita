/**
 * GOOGLE APPS SCRIPT BACKEND FOR VIBE CODING OSTRAVA
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Rename sheets (tabs) to: "profiles", "events", "topics", "topic_votes", "date_options", "date_votes".
 * 3. Go to Extensions -> Apps Script.
 * 4. Paste this code.
 * 5. Click "Deploy" -> "New Deployment" -> "Web App".
 * 6. Execute as: "Me", Who has access: "Anyone".
 * 7. Copy the Web App URL and put it in your .env file as VITE_API_URL.
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getEvent') {
      const sheet = ss.getSheetByName('events');
      if (!sheet) return jsonResponse({ event: null, error: 'Sheet "events" not found' });
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse({ event: null });
      
      const headers = data.shift();
      const activeIndex = headers.indexOf('is_active');
      const activeEvent = data.find(row => row[activeIndex] === true || row[activeIndex] === 'TRUE');
      
      if (!activeEvent) return jsonResponse({ event: null });
      
      const eventObj = {};
      headers.forEach((h, i) => { if(h) eventObj[h] = activeEvent[i]; });
      return jsonResponse({ event: eventObj });
    }

    if (action === 'getTopics') {
      const eventId = e.parameter.eventId;
      const topics = getSheetData('topics').filter(t => String(t.event_id) === String(eventId));
      const profiles = getSheetData('profiles');
      const votes = getSheetData('topic_votes');
      
      const result = topics.map(t => ({
        ...t,
        author: { name: profiles.find(p => String(p.id) === String(t.author_id))?.name || 'Anonym' },
        votes: votes.filter(v => String(v.topic_id) === String(t.id))
      }));
      
      return jsonResponse(result);
    }

    if (action === 'getDateOptions') {
      const eventId = e.parameter.eventId;
      const options = getSheetData('date_options').filter(o => String(o.event_id) === String(eventId));
      const votes = getSheetData('date_votes');
      
      const result = options.map(o => ({
        ...o,
        votes: votes.filter(v => String(v.date_option_id) === String(o.id))
      }));
      
      return jsonResponse(result);
    }

    if (action === 'getEvents') {
      return jsonResponse(getSheetData('events'));
    }

    if (action === 'getMembers') {
      return jsonResponse(getSheetData('profiles'));
    }

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'login') {
      const email = String(data.email).toLowerCase().trim();
      const profiles = getSheetData('profiles');
      let profile = profiles.find(p => String(p.id).toLowerCase() === email);
      
      if (!profile) {
        const sheet = ss.getSheetByName('profiles');
        sheet.appendRow([email, email.split('@')[0], '', false, new Date()]);
        profile = { id: email, name: email.split('@')[0], is_admin: false };
      }
      return jsonResponse({ session: { user: { id: email, email: email } }, profile: profile });
    }

    if (action === 'addTopic') {
      const sheet = ss.getSheetByName('topics');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.eventId, data.text, data.authorId, new Date()]);
      return jsonResponse({ success: true });
    }

    if (action === 'toggleTopicVote') {
      const sheet = ss.getSheetByName('topic_votes');
      const votes = getSheetData('topic_votes');
      const existingIndex = votes.findIndex(v => String(v.topic_id) === String(data.topicId) && String(v.profile_id).toLowerCase() === String(data.profileId).toLowerCase());
      
      if (existingIndex > -1) {
        sheet.deleteRow(existingIndex + 2);
      } else {
        sheet.appendRow([data.topicId, data.profileId]);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'toggleDateVote') {
      const sheet = ss.getSheetByName('date_votes');
      const votes = getSheetData('date_votes');
      const existingIndex = votes.findIndex(v => String(v.date_option_id) === String(data.optionId) && String(v.profile_id).toLowerCase() === String(data.profileId).toLowerCase());
      
      if (existingIndex > -1) {
        sheet.deleteRow(existingIndex + 2);
      } else {
        sheet.appendRow([data.optionId, data.profileId]);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'saveProfile') {
      const sheet = ss.getSheetByName('profiles');
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows.shift();
      const idIndex = headers.indexOf('id');
      const rowIndex = dataRows.findIndex(row => String(row[idIndex]).toLowerCase() === String(data.id).toLowerCase());
      
      if (rowIndex > -1) {
        sheet.getRange(rowIndex + 2, headers.indexOf('name') + 1).setValue(data.name);
        sheet.getRange(rowIndex + 2, headers.indexOf('bio') + 1).setValue(data.bio);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'createEvent') {
      const eventSheet = ss.getSheetByName('events');
      const dateSheet = ss.getSheetByName('date_options');
      const eventId = Utilities.getUuid();
      
      // Deactivate other events
      const dataRows = eventSheet.getDataRange().getValues();
      const headers = dataRows.shift();
      const activeIndex = headers.indexOf('is_active');
      if (activeIndex > -1) {
        for (let i = 0; i < dataRows.length; i++) {
          eventSheet.getRange(i + 2, activeIndex + 1).setValue(false);
        }
      }

      eventSheet.appendRow([eventId, data.title, data.description, data.venue, true, new Date()]);
      
      if (data.dates && Array.isArray(data.dates)) {
        data.dates.forEach(label => {
          if (label.trim()) {
            dateSheet.appendRow([Utilities.getUuid(), eventId, label.trim(), new Date()]);
          }
        });
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getSheetData(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
