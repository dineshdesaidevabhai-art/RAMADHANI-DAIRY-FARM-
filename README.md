# રામાધણી ડેરી ફાર્મ

Premium Gujarati React + Vite dairy management starter.

## મુખ્ય સુવિધાઓ
- Owner-only dashboard UI
- ગ્રાહક ઉમેરો/સંપાદિત/ડિલીટ
- Morning/Evening દૂધ entry
- માસિક litres અને bill calculation
- ગ્રાહક-wise ledger
- Advance / Remaining management
- Secure customer token URL structure
- WhatsApp monthly bill message generator
- Customer-facing private ledger page
- Gujarati AI chatbot UI + voice-ready architecture
- Settings અને Privacy & Security
- Firebase/Supabase integration boundary
- No secrets in frontend

## ચલાવવું
```bash
npm install
npm run dev
```

Production:
```bash
npm run build
npm run preview
```

## મહત્વની Security નોંધ
આ project demo/local storage data layer સાથે runnable છે. Productionમાં customer privacy માટે frontend-only authorization પૂરતું નથી.

Production architecture:
1. Firebase Auth / Supabase Auth વડે Owner authentication.
2. Databaseમાં customers, milk_entries, payments, customer_tokens.
3. Server-side/API layer token validate કરે.
4. Database Row Level Security (Supabase) અથવા Firestore Security Rules લાગુ કરો.
5. AI API key અને WhatsApp provider secret માત્ર server environmentમાં રાખો.
6. Public customer URLમાં random opaque token વાપરો; customer ID/phone expose ન કરો.
7. Token revoke/rotate કરવાની સુવિધા રાખો.

## Suggested production schema
- customers: id, name, mobile, address, morning_milk, evening_milk, rate, advance, created_at
- milk_entries: id, customer_id, date, session, litres, created_at
- payments: id, customer_id, date, amount, note
- customer_tokens: id, customer_id, token_hash, expires_at, revoked_at
- owner_users: id, auth_uid, role

## API boundary
Frontendથી private secrets ક્યારેય ન મોકલવા. Suggested endpoints:
- POST /api/owner/customers
- GET /api/owner/customers
- POST /api/owner/milk-entries
- GET /api/customer/ledger/:token
- POST /api/ai/chat
- POST /api/whatsapp/monthly-bill

આ starterમાં `/src/services/api.js` અને `/src/services/backend.js` integration points આપેલા છે.