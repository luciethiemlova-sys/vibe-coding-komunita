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
    
    if (action === 'diagnostics') {
      const sheets = ss.getSheets().map(s => s.getName());
      const required = ["profiles", "events", "topics", "topic_votes", "date_options", "date_votes"];
      const missing = required.filter(r => !sheets.includes(r));
      return jsonResponse({ sheets, required, missing, status: missing.length === 0 ? 'OK' : 'MISSING_SHEETS' });
    }

    if (action === 'getEvent') {
      const sheet = ss.getSheetByName('events');
      if (!sheet) return jsonResponse({ event: null, error: 'Sheet "events" not found' });
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse({ event: null });
      
      const headers = data.shift().map(h => String(h).toLowerCase().trim());
      const activeIndex = headers.indexOf('is_active');
      if (activeIndex === -1) return jsonResponse({ event: null, error: 'Column "is_active" not found in events sheet' });
      
      const activeEvent = data.find(row => {
        const val = String(row[activeIndex]).toUpperCase();
        return val === 'TRUE' || val === '1' || row[activeIndex] === true;
      });
      
      if (!activeEvent) return jsonResponse({ event: null });
      
      const eventObj = {};
      const originalHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      originalHeaders.forEach((h, i) => { if(h) eventObj[h] = activeEvent[i]; });
      return jsonResponse({ event: eventObj });
    }

    if (action === 'getTopics') {
      const eventId = e.parameter.eventId;
      const topics = getSheetData('topics').filter(t => String(t.event_id || t.Event_Id) === String(eventId));
      const profiles = getSheetData('profiles');
      const votes = getSheetData('topic_votes');
      
      const result = topics.map(t => {
        const id = t.id || t.Id;
        return {
          ...t,
          id: id,
          author: { name: profiles.find(p => String(p.id || p.Id).toLowerCase() === String(t.author_id || t.Author_Id).toLowerCase())?.name || 'Anonym' },
          votes: votes.filter(v => String(v.topic_id || v.Topic_Id) === String(id))
        };
      });
      
      return jsonResponse(result);
    }

    if (action === 'getDateOptions') {
      const eventId = e.parameter.eventId;
      const options = getSheetData('date_options').filter(o => String(o.event_id || o.Event_Id) === String(eventId));
      const votes = getSheetData('date_votes');
      
      const result = options.map(o => {
        const id = o.id || o.Id;
        return {
          ...o,
          id: id,
          votes: votes.filter(v => String(v.date_option_id || v.Date_Option_Id) === String(id))
        };
      });
      
      return jsonResponse(result);
    }

    if (action === 'getEvents') return jsonResponse(getSheetData('events'));
    if (action === 'getMembers') return jsonResponse(getSheetData('profiles'));

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
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
      let profile = profiles.find(p => String(p.id || p.Id).toLowerCase() === email);
      
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
      const existingIndex = votes.findIndex(v => String(v.topic_id || v.Topic_Id) === String(data.topicId) && String(v.profile_id || v.Profile_Id).toLowerCase() === String(data.profileId).toLowerCase());
      
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
      const existingIndex = votes.findIndex(v => String(v.date_option_id || v.Date_Option_Id) === String(data.optionId) && String(v.profile_id || v.Profile_Id).toLowerCase() === String(data.profileId).toLowerCase());
      
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
      const headers = dataRows[0].map(h => String(h).toLowerCase().trim());
      const idIndex = headers.indexOf('id');
      const rowIndex = dataRows.findIndex((row, idx) => idx > 0 && String(row[idIndex]).toLowerCase() === String(data.id).toLowerCase());
      
      if (rowIndex > -1) {
        sheet.getRange(rowIndex + 1, headers.indexOf('name') + 1).setValue(data.name);
        sheet.getRange(rowIndex + 1, headers.indexOf('bio') + 1).setValue(data.bio);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'createEvent') {
      const eventSheet = ss.getSheetByName('events');
      const dateSheet = ss.getSheetByName('date_options');
      const eventId = Utilities.getUuid();
      
      // Deactivate other events
      const dataRows = eventSheet.getDataRange().getValues();
      const headers = dataRows[0].map(h => String(h).toLowerCase().trim());
      const activeIndex = headers.indexOf('is_active');
      if (activeIndex > -1) {
        for (let i = 1; i < dataRows.length; i++) {
          eventSheet.getRange(i + 1, activeIndex + 1).setValue(false);
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
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function getSheetData(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const originalHeaders = data.shift();
  
  // Normalize headers: lowercase, trim, remove accents, and map common Czech terms
  const headers = originalHeaders.map(h => {
    let clean = String(h).toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    
    // Map Czech synonyms to standard English keys used in frontend
    if (clean === 'termin' || clean === 'datum' || clean === 'nazev') return 'label';
    if (clean === 'id_udalosti' || clean === 'udalost_id') return 'event_id';
    if (clean === 'autor_id') return 'author_id';
    if (clean === 'profil_id') return 'profile_id';
    if (clean === 'vytvoreno') return 'created_at';
    return clean;
  });
  
  return data
    .filter(row => row.some(cell => String(cell).trim() !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
      return obj;
    });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
