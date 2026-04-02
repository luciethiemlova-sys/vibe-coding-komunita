/**
 * GOOGLE APPS SCRIPT BACKEND FOR VIBE CODING OSTRAVA
 * 
 * Instructions:
 * 1. Create a new Google Sheet.
 * 2. Rename sheets (tabs) to: "profiles", "events", "topics", "topic_votes", "date_options", "date_votes", "login_tokens".
 * 3. Go to Extensions -> Apps Script.
 * 4. Paste this code.
 * 5. Click "Deploy" -> "New Deployment" -> "Web App".
 * 6. Execute as: "Me", Who has access: "Anyone".
 * 7. Copy the Web App URL and put it in your .env file as VITE_API_URL.
 */

const VERSION = "1.2.0";

// ⚠️ SEM DO UVOZOVEK VLOŽ CELOU ADRESU TVÉ GOOGLE TABULKY!
const SHEET_URL = "VLOZ_SEM_CELOU_ADRESU_TVE_TABULKY";

function doGet(e) {
  try {
    const action = String(e.parameter.action || "").trim().toLowerCase();
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    
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

    const getSheet = (name) => {
      if (name === 'profiles') return ss.getSheetByName('profiles') || ss.getSheetByName('profile') || ss.getSheetByName('uzivatele');
      return ss.getSheetByName(name);
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
      const topicsData = getSheetData('topics');
      const topics = Array.isArray(topicsData) ? topicsData.filter(t => String(t.event_id || t.Event_Id) === String(eventId)) : [];
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

    if (action === 'getrsvps') {
      const eventId = e.parameter.eventId;
      const rsvps = getSheetData('event_rsvps').filter(r => String(r.event_id || r.Event_Id) === String(eventId) && String(r.status).toLowerCase() === 'yes');
      return jsonResponse(rsvps);
    }

    if (action === 'getevents') return jsonResponse(getSheetData('events'));
    if (action === 'getmembers') {
      const profiles = getSheetData('profiles');
      // Find active event and attach RSVP info
      const eventsData = getSheetData('events');
      const activeEvent = eventsData.find(ev => ev.is_active === true || String(ev.is_active).toLowerCase() === 'true');
      if (activeEvent) {
        const rsvps = getSheetData('event_rsvps').filter(r => String(r.event_id || r.Event_Id) === String(activeEvent.id) && String(r.status).toLowerCase() === 'yes');
        profiles.forEach(p => {
          p.rsvp = rsvps.some(r => String(r.profile_id).toLowerCase() === String(p.id).toLowerCase()) ? 'yes' : 'no';
        });
      }
      return jsonResponse(profiles);
    }

    // ✅ VERIFYTOKEN via GET (fixes "Load Failed" CORS issue with POST)
    if (action === 'verifytoken') {
      const token = String(e.parameter.token || '').trim();
      if (!token) return jsonResponse({ error: 'Token chybí.' });
      const sheet = ss.getSheetByName('login_tokens');
      if (!sheet) return jsonResponse({ error: 'Sheet "login_tokens" not found' });
      
      const rows = sheet.getDataRange().getValues();
      const rowIndex = rows.findIndex((row, idx) => idx > 0 && String(row[0]) === token);
      
      if (rowIndex > -1) {
        const email = String(rows[rowIndex][1]).toLowerCase().trim();
        sheet.deleteRow(rowIndex + 1); // Mark as used
        const isAdmin = email === 'luciesteffkova@gmail.com';
        
        const profiles = getSheetData('profiles');
        let profile = profiles.find(p => String(p.id || p.Id).toLowerCase() === email);
        
        if (!profile) {
          const profileSheet = ss.getSheetByName('profiles');
          profileSheet.appendRow([email, email.split('@')[0], '', isAdmin, new Date()]);
          profile = { id: email, name: email.split('@')[0], is_admin: isAdmin };
        } else if (isAdmin && !profile.is_admin) {
           const pRows = ss.getSheetByName('profiles').getDataRange().getValues();
           const pHeaders = pRows[0].map(h => normalizeHeader(h));
           const pRowIdx = pRows.findIndex((r, idx) => idx > 0 && String(r[0]).toLowerCase() === email);
           if (pRowIdx > -1 && pHeaders.indexOf('is_admin') > -1) {
             ss.getSheetByName('profiles').getRange(pRowIdx + 1, pHeaders.indexOf('is_admin') + 1).setValue(true);
             profile.is_admin = true;
           }
        }
        return jsonResponse({ session: { user: { id: email, email: email } }, profile: profile });
      }
      return jsonResponse({ error: 'Neplatný nebo vypršelý odkaz.' });
    }

    // ✅ LOGIN via GET (fixes "Load Failed" CORS issue with POST)
    if (action === 'login') {
      const email = String(e.parameter.email || '').toLowerCase().trim();
      if (!email) return jsonResponse({ error: 'Email chybí.' });
      const profiles = getSheetData('profiles');
      let profile = profiles.find(p => String(p.id || p.Id).toLowerCase() === email);
      const isAdmin = email === 'luciesteffkova@gmail.com';
      
      if (!profile) {
        const sheet = ss.getSheetByName('profiles');
        sheet.appendRow([email, email.split('@')[0], '', isAdmin, new Date()]);
        profile = { id: email, name: email.split('@')[0], is_admin: isAdmin };
      } else if (isAdmin && !profile.is_admin) {
           const pRows = ss.getSheetByName('profiles').getDataRange().getValues();
           const pHeaders = pRows[0].map(h => normalizeHeader(h));
           const pRowIdx = pRows.findIndex((r, idx) => idx > 0 && String(r[0]).toLowerCase() === email);
           if (pRowIdx > -1 && pHeaders.indexOf('is_admin') > -1) {
             ss.getSheetByName('profiles').getRange(pRowIdx + 1, pHeaders.indexOf('is_admin') + 1).setValue(true);
             profile.is_admin = true;
           }
      }
      return jsonResponse({ session: { user: { id: email, email: email } }, profile: profile });
    }

    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString(), stack: err.stack });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = String(data.action || "").trim().toLowerCase();
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);

    if (action === 'sendmagiclink') {
      const email = String(data.email).toLowerCase().trim();
      let sheet = ss.getSheetByName('login_tokens');
      if (!sheet) {
        sheet = ss.insertSheet('login_tokens');
        sheet.appendRow(['token', 'email', 'created_at']);
      }
      
      const token = Utilities.getUuid();
      sheet.appendRow([token, email, new Date()]);
      
      const appUrl = data.appUrl || 'https://vibe-coding-komunita.netlify.app'; // Fallback
      const loginUrl = appUrl.includes('?') ? `${appUrl}&token=${token}` : `${appUrl}?token=${token}`;
      
      MailApp.sendEmail({
        to: email,
        subject: "Tvůj přihlašovací odkaz čeká 👾",
        htmlBody: `<h3>Vítej, Vibe Codere! 👋</h3>
<p>Někdo (doufáme, že ty) chce skočit dovnitř. Tady je tvůj odkaz:</p>
<p><a href="${loginUrl}" style="padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">👉 Přihlásit se</a></p>
<p>Odkaz vyprší za 15 minut — tak na co čekáš?</p>
<p style="color: #666; font-size: 0.9em; margin-top: 20px;">Pokud jsi o přihlášení nežádal/a, prostě to ignoruj. Nic se nestane.</p>`
      });
      
      return jsonResponse({ success: true });
    }

    if (action === 'verifytoken') {
      const token = String(data.token).trim();
      const sheet = ss.getSheetByName('login_tokens');
      if (!sheet) return jsonResponse({ error: 'Sheet "login_tokens" not found' });
      
      const rows = sheet.getDataRange().getValues();
      const rowIndex = rows.findIndex((row, idx) => idx > 0 && String(row[0]) === token);
      
      if (rowIndex > -1) {
        const email = String(rows[rowIndex][1]).toLowerCase().trim();
        sheet.deleteRow(rowIndex + 1); // Mark as used
        const isAdmin = email === 'luciesteffkova@gmail.com';
        
        const profiles = getSheetData('profiles');
        let profile = profiles.find(p => String(p.id || p.Id).toLowerCase() === email);
        
        if (!profile) {
          const profileSheet = ss.getSheetByName('profiles');
          profileSheet.appendRow([email, email.split('@')[0], '', isAdmin, new Date()]);
          profile = { id: email, name: email.split('@')[0], is_admin: isAdmin };
        } else if (isAdmin && !profile.is_admin) {
           const pRows = ss.getSheetByName('profiles').getDataRange().getValues();
           const pHeaders = pRows[0].map(h => normalizeHeader(h));
           const pRowIdx = pRows.findIndex((r, idx) => idx > 0 && String(r[0]).toLowerCase() === email);
           if (pRowIdx > -1 && pHeaders.indexOf('is_admin') > -1) {
             ss.getSheetByName('profiles').getRange(pRowIdx + 1, pHeaders.indexOf('is_admin') + 1).setValue(true);
             profile.is_admin = true;
           }
        }
        return jsonResponse({ session: { user: { id: email, email: email } }, profile: profile });
      }
      return jsonResponse({ error: 'Neplatný nebo vypršelý odkaz.' });
    }

    if (action === 'login') {
      const email = String(data.email).toLowerCase().trim();
      const profiles = getSheetData('profiles');
      let profile = profiles.find(p => String(p.id || p.Id).toLowerCase() === email);
      const isAdmin = email === 'luciesteffkova@gmail.com';
      
      if (!profile) {
        const sheet = ss.getSheetByName('profiles');
        sheet.appendRow([email, email.split('@')[0], '', isAdmin, new Date()]);
        profile = { id: email, name: email.split('@')[0], is_admin: isAdmin };
      } else if (isAdmin && !profile.is_admin) {
           const pRows = ss.getSheetByName('profiles').getDataRange().getValues();
           const pHeaders = pRows[0].map(h => normalizeHeader(h));
           const pRowIdx = pRows.findIndex((r, idx) => idx > 0 && String(r[0]).toLowerCase() === email);
           if (pRowIdx > -1 && pHeaders.indexOf('is_admin') > -1) {
             ss.getSheetByName('profiles').getRange(pRowIdx + 1, pHeaders.indexOf('is_admin') + 1).setValue(true);
             profile.is_admin = true;
           }
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
      if (!sheet) return jsonResponse({ error: 'Sheet "topic_votes" not found' });
      
      const votesRows = sheet.getDataRange().getValues();
      const headers = votesRows[0].map(h => normalizeHeader(h));
      const topicIdIdx = headers.indexOf('topic_id');
      const profileIdIdx = headers.indexOf('profile_id');
      const voteTypeIdx = headers.indexOf('vote_type');
      
      if (topicIdIdx === -1 || profileIdIdx === -1) {
        return jsonResponse({ error: 'Required columns (topic_id, profile_id) not found in topic_votes' });
      }
      
      const voteType = data.voteType || 1; // 1 for up, -1 for down
      
      const existingRowIndex = votesRows.findIndex((row, idx) => 
        idx > 0 && 
        String(row[topicIdIdx]) === String(data.topicId) && 
        String(row[profileIdIdx]).toLowerCase() === String(data.profileId).toLowerCase()
      );
      
      if (existingRowIndex > -1) {
        const currVote = voteTypeIdx > -1 ? parseInt(votesRows[existingRowIndex][voteTypeIdx]) || 1 : 1;
        if (currVote === parseInt(voteType)) {
          sheet.deleteRow(existingRowIndex + 1);
        } else {
          if (voteTypeIdx > -1) {
            sheet.getRange(existingRowIndex + 1, voteTypeIdx + 1).setValue(voteType);
          } else {
            // Unvote if column doesn't exist
            sheet.deleteRow(existingRowIndex + 1);
          }
        }
      } else {
        const newRow = new Array(headers.length).fill("");
        newRow[topicIdIdx] = data.topicId;
        newRow[profileIdIdx] = data.profileId;
        if (voteTypeIdx > -1) newRow[voteTypeIdx] = voteType;
        sheet.appendRow(newRow);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'toggledatevote') {
      const sheet = ss.getSheetByName('date_votes');
      if (!sheet) return jsonResponse({ error: 'Sheet "date_votes" not found' });
      
      const votesRows = sheet.getDataRange().getValues();
      const headers = votesRows[0].map(h => normalizeHeader(h));
      const optionIdIdx = headers.indexOf('date_option_id');
      const profileIdIdx = headers.indexOf('profile_id');
      
      if (optionIdIdx === -1 || profileIdIdx === -1) {
        return jsonResponse({ error: 'Required columns not found in date_votes' });
      }
      
      const existingRowIndex = votesRows.findIndex((row, idx) => 
        idx > 0 && 
        String(row[optionIdIdx]) === String(data.optionId) && 
        String(row[profileIdIdx]).toLowerCase() === String(data.profileId).toLowerCase()
      );
      
      if (existingRowIndex > -1) {
        sheet.deleteRow(existingRowIndex + 1);
      } else {
        const newRow = new Array(headers.length).fill("");
        newRow[optionIdIdx] = data.optionId;
        newRow[profileIdIdx] = data.profileId;
        sheet.appendRow(newRow);
      }
      return jsonResponse({ success: true });
    }

    if (action === 'saveprofile') {
      let sheet = ss.getSheetByName('profiles') || ss.getSheetByName('profile');
      if (!sheet) return jsonResponse({ error: 'Sheet "profiles" or "profile" not found' });
      
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows[0].map(h => normalizeHeader(h));
      
      // Find the ID column (id, profile_id, email, etc.)
      const idIdx = headers.indexOf('id');
      if (idIdx === -1) return jsonResponse({ error: 'ID column not found in profile sheet' });
      
      const rowIndex = dataRows.findIndex((row, idx) => idx > 0 && String(row[idIdx]).toLowerCase() === String(data.id).toLowerCase());
      
      if (rowIndex > -1) {
        const row = rowIndex + 1;
        const setVal = (key, val) => {
          const colIdx = headers.indexOf(key);
          if (colIdx > -1) sheet.getRange(row, colIdx + 1).setValue(val || "");
        };
        
        setVal('name', data.name);
        setVal('bio', data.bio);
        setVal('phone', data.phone);
        setVal('photo', data.photo);
      } else {
        return jsonResponse({ error: 'User profile not found: ' + data.id });
      }
      return jsonResponse({ success: true });
    }

    if (action === 'deletemember') {
      const sheet = ss.getSheetByName('profiles');
      if (!sheet) return jsonResponse({ error: 'Profiles sheet not found' });
      const dataRows = sheet.getDataRange().getValues();
      const headers = dataRows[0].map(h => normalizeHeader(h));
      const idIndex = headers.indexOf('profile_id') > -1 ? headers.indexOf('profile_id') : 0; // fallback to col 0 which is usually ID
      
      const rowIndex = dataRows.findIndex((row, idx) => idx > 0 && String(row[idIndex]).trim().toLowerCase() === String(data.memberId).trim().toLowerCase());
      
      if (rowIndex > -1) {
        sheet.deleteRow(rowIndex + 1);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Member not found: ' + data.memberId });
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

    if (action === 'togglerspv') {
      let sheet = ss.getSheetByName('event_rsvps');
      if (!sheet) {
        sheet = ss.insertSheet('event_rsvps');
        sheet.appendRow(['event_id', 'profile_id', 'status', 'created_at']);
      }
      
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0].map(h => normalizeHeader(h));
      const eventIdIdx = headers.indexOf('event_id');
      const profileIdIdx = headers.indexOf('profile_id');
      const statusIdx = headers.indexOf('status');
      
      if (eventIdIdx === -1 || profileIdIdx === -1) {
        return jsonResponse({ error: 'Required columns not found in event_rsvps' });
      }
      
      const existingRowIndex = rows.findIndex((row, idx) => 
        idx > 0 && 
        String(row[eventIdIdx]) === String(data.eventId) && 
        String(row[profileIdIdx]).toLowerCase() === String(data.profileId).toLowerCase()
      );
      
      if (existingRowIndex > -1) {
        // Already exists -> remove (toggle off)
        sheet.deleteRow(existingRowIndex + 1);
        return jsonResponse({ success: true, status: 'removed' });
      } else {
        // Add RSVP
        const newRow = new Array(headers.length).fill('');
        newRow[eventIdIdx] = data.eventId;
        newRow[profileIdIdx] = data.profileId;
        if (statusIdx > -1) newRow[statusIdx] = 'yes';
        const createdIdx = headers.indexOf('created_at');
        if (createdIdx > -1) newRow[createdIdx] = new Date();
        sheet.appendRow(newRow);
        return jsonResponse({ success: true, status: 'added' });
      }
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

  // 1. SPECIFICKÁ ID MAPOVÁNÍ (musí být první!)
  if (clean === 'id' || clean === 'email' || clean === 'user_id' || clean === 'uzivatel_id' || clean === 'id_uzivatele' || clean === 'id_clena' || clean === 'member_id') return 'id';
  if (clean === 'name' || clean === 'jmeno' || clean === 'prijmeni' || clean === 'cele_jmeno') return 'name';
  if (clean === 'bio' || clean === 'popis' || clean === 'o_mne') return 'bio';
  if (clean === 'date_option_id' || clean === 'date_option' || clean === 'id_moznosti_terminu' || clean === 'option_id' || clean === 'termin_id' || clean === 'id_terminu') return 'date_option_id';
  if (clean === 'topic_id' || clean === 'id_tematu' || clean === 'tema_id') return 'topic_id';
  if (clean === 'id_udalosti' || clean === 'udalost_id' || clean === 'id_event' || clean === 'event_id') return 'event_id';
  if (clean === 'profil_id' || clean === 'profile_id') return 'profile_id';
  if (clean === 'autor_id' || clean === 'author_id' || clean === 'vytvoril') return 'author_id';
  if (clean === 'title' || clean === 'nazev' || clean === 'titulek') return 'title';
  if (clean === 'description' || clean === 'popis' || clean === 'informace') return 'description';
  if (clean === 'venue' || clean === 'misto' || clean === 'lokace') return 'venue';
  if (clean === 'vytvoreno' || clean === 'created_at' || clean === 'cas_vytvoreni') return 'created_at';
  if (clean === 'is_active' || clean === 'aktivni' || clean === 'stav') return 'is_active';
  if (clean === 'is_admin' || clean === 'admin' || clean === 'spravce') return 'is_admin';
  if (clean === 'vote_type' || clean === 'typ_hlasu' || clean === 'hlas') return 'vote_type';
  if (clean === 'phone' || clean === 'telefon' || clean === 'tel' || clean === 'cislo' || clean === 'mobil') return 'phone';
  if (clean === 'photo' || clean === 'fotka' || clean === 'avatar' || clean === 'obrazek') return 'photo';

  // 2. OBECNÁ MAPOVÁNÍ PRO POPISKY (jako poslední záchrana)
  if (clean === 'text') return 'text'; 
  const labelMatches = ['termin', 'dat', 'label', 'cas', 'moznost', 'nazev_moznosti', 'kdy', 'info'];
  if (labelMatches.some(m => clean.includes(m))) return 'label';

  return clean;
}

function getSheetData(name) {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  let sheet = ss.getSheetByName(name);
  if (!sheet && name === 'profiles') sheet = ss.getSheetByName('profile') || ss.getSheetByName('uzivatele');
  
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
