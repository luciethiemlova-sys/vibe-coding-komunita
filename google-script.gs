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

const VERSION = "1.0.5";

function doGet(e) {
  try {
    const action = String(e.parameter.action || "").trim().toLowerCase();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // DIAGNOSTIKA - uvidíme přesně, co je v tabulce
    if (action === 'diagnostics') {
      const sheets = ss.getSheets().map(s => s.getName());
      const headers = {};
      const sheetData = {};
      sheets.forEach(name => {
        const s = ss.getSheetByName(name);
        if (s) {
          const vals = s.getDataRange().getValues();
          headers[name] = vals[0];
          sheetData[name] = vals.length > 1 ? vals[1] : "EMPTY";
        }
      });
      return jsonResponse({ version: VERSION, sheets, headers, sampleRow: sheetData, status: 'OK' });
    }

    if (action === 'getevent') {
      const sheet = ss.getSheetByName('events');
      if (!sheet) return jsonResponse({ event: null, error: 'Sheet "events" not found' });
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse({ event: null });
      
      const originalHeaders = data.shift();
      const headers = originalHeaders.map(h => normalizeHeader(h));
      const activeIndex = headers.indexOf('is_active');
      
      if (activeIndex === -1) return jsonResponse({ event: null, error: 'Column "is_active" not found in events sheet' });
      
      const activeEventRow = data.find(row => {
        const val = String(row[activeIndex]).toUpperCase();
        return val === 'TRUE' || val === '1' || row[activeIndex] === true;
      });
      
      if (!activeEventRow) return jsonResponse({ event: null });
      
      const eventObj = {};
      headers.forEach((h, i) => { 
        if(h) eventObj[h] = activeEventRow[i]; 
      });
      return jsonResponse({ event: eventObj });
    }

    if (action === 'gettopics') {
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

    if (action === 'getdateoptions') {
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

    if (action === 'getevents') return jsonResponse(getSheetData('events'));
    if (action === 'getmembers') return jsonResponse(getSheetData('profiles'));

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = String(data.action || "").trim().toLowerCase();
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

    if (action === 'addtopic') {
      const sheet = ss.getSheetByName('topics');
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.eventId, data.text, data.authorId, new Date()]);
      return jsonResponse({ success: true });
    }

    if (action === 'toggletopicvote') {
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

    if (action === 'toggledatevote') {
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

    if (action === 'saveprofile') {
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

    if (action === 'createevent') {
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

    if (action === 'deletetopic') {
      const sheet = ss.getSheetByName('topics');
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows[0].map(h => normalizeHeader(h));
      const idIndex = headers.indexOf('id');
      const rowIndex = dataRows.findIndex((row, idx) => idx > 0 && String(row[idIndex]) === String(data.topicId));
      
      if (rowIndex > -1) {
        sheet.deleteRow(rowIndex + 1);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Topic not found' });
    }

    if (action === 'saveevent') {
      const sheet = ss.getSheetByName('events');
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows[0].map(h => normalizeHeader(h));
      const idIndex = headers.indexOf('id');
      const rowIndex = dataRows.findIndex((row, idx) => idx > 0 && String(row[idIndex]) === String(data.id));
      
      if (rowIndex > -1) {
        if (data.title) sheet.getRange(rowIndex + 1, headers.indexOf('title') + 1).setValue(data.title);
        if (data.description) sheet.getRange(rowIndex + 1, headers.indexOf('description') + 1).setValue(data.description);
        if (data.venue) sheet.getRange(rowIndex + 1, headers.indexOf('venue') + 1).setValue(data.venue);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Event not found' });
    }

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function normalizeHeader(h) {
  if (!h) return "";
  let clean = String(h).toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // odstranění diakritiky
    .replace(/[^a-z0-9_]/g, "_") // nahrazení speciálních znaků podtržítkem
    .replace(/_+/g, "_") // odstranění duplicitních podtržítek
    .replace(/^_|_$/g, ""); // odstranění podtržítek na začátku/konci

  // Mapování synonym na standardní klíče
  if (clean === 'text') return 'text'; // Zachovat 'text' jako 'text' (důležité pro témata)
  
  const labelMatches = ['termin', 'dat', 'label', 'cas', 'moznost', 'nazev_moznosti', 'kdy', 'info'];
  if (labelMatches.some(m => clean.includes(m)) && !clean.includes('udalost') && !clean.includes('event')) return 'label';
  
  if (clean === 'id_udalosti' || clean === 'udalost_id' || clean === 'id_event' || clean === 'event_id') return 'event_id';
  if (clean === 'autor_id' || clean === 'author_id' || clean === 'vytvoril') return 'author_id';
  if (clean === 'profil_id' || clean === 'profile_id' || clean === 'user_id' || clean === 'uzivatel_id') return 'profile_id';
  if (clean === 'vytvoreno' || clean === 'created_at' || clean === 'cas_vytvoreni') return 'created_at';
  if (clean === 'is_active' || clean === 'aktivni' || clean === 'stav') return 'is_active';
  if (clean === 'is_admin' || clean === 'admin' || clean === 'spravce') return 'is_admin';
  if (clean === 'title' || clean === 'nazev' || clean === 'titulek') return 'title';
  if (clean === 'description' || clean === 'popis' || clean === 'informace') return 'description';
  if (clean === 'venue' || clean === 'misto' || clean === 'lokace') return 'venue';
  
  return clean;
}

function getSheetData(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const originalHeaders = data.shift();
  const headers = originalHeaders.map(h => normalizeHeader(h));
  
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
