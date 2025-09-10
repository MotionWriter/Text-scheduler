// scripts/simulate_contacts_csv.mjs
// Simulates Contacts CSV parsing and US phone normalization/validation

function normalizeUsDigits(value) {
  let d = String(value).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cur += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(cur); cur = ""; i++; continue; }
      if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
      if (ch === "\r") { i++; continue; }
      cur += ch; i++;
    }
  }
  row.push(cur);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(h) { return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""); }

function simulate(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return { valids: [], invalids: [{ row: 0, reason: "Empty file" }] };

  const headers = rows[0].map(normalizeHeader);
  const nameIdx = headers.findIndex((h) => ["name", "fullname"].includes(h));
  const phoneIdx = headers.findIndex((h) => ["phonenumber", "phone", "mobile", "cell"].includes(h));
  const emailIdx = headers.findIndex((h) => ["email", "emailaddress"].includes(h));
  const notesIdx = headers.findIndex((h) => ["notes", "note"].includes(h));

  if (nameIdx === -1 || phoneIdx === -1) {
    return { valids: [], invalids: [{ row: 0, reason: "Missing required headers: name and phoneNumber" }] };
  }

  const valids = [];
  const invalids = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (cols.length === 1 && cols[0].trim() === "") continue;

    const name = (cols[nameIdx] || "").trim();
    const phoneRaw = (cols[phoneIdx] || "").trim();
    const email = emailIdx !== -1 ? (cols[emailIdx] || "").trim() : "";
    const notes = notesIdx !== -1 ? (cols[notesIdx] || "").trim() : "";

    if (!name) { invalids.push({ row: r + 1, reason: "Missing name" }); continue; }
    if (!phoneRaw) { invalids.push({ row: r + 1, reason: "Missing phoneNumber" }); continue; }

    const normalized = normalizeUsDigits(phoneRaw);
    if (normalized.length !== 10) {
      invalids.push({ row: r + 1, reason: `Invalid US phone after normalization: got ${normalized.length} digits` });
      continue;
    }

    valids.push({ name, phoneNumber: normalized, email: email || undefined, notes: notes || undefined });
  }

  return { valids, invalids };
}

const SAMPLE = `name,phoneNumber,email,notes\n`
  + `John Doe,1234567890,john@example.com,raw digits\n`
  + `Jane Smith,(123) 456-7890,jane@example.com,paren+hyphen\n`
  + `Bob,+1 123 456 7890,bob@example.com,plus one spaced\n`
  + `Ann,1-234-567-8901,ann@example.com,leading 1 dashes\n`
  + `Eve,123.456.7890,eve@example.com,dots\n`
  + `Tom,123-45-67890,tom@example.com,odd grouping (still 10 digits)\n`
  + `Al,234567890,al@example.com,9 digits - invalid\n`
  + `Pat,+44 20 1234 5678,pat@example.com,UK number - invalid\n`
  + `Rick,,rick@example.com,missing phone\n`
  + `"Quoted, Name","  +1 (987) 654-3210 ",quoted@example.com,quoted name + spaces\n`;

const result = simulate(SAMPLE);
console.log(JSON.stringify(result, null, 2));

