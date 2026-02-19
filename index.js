const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./credentials.json');

// On récupère les 5 ordres envoyés par l'appli Python (Ajout de userApiKey)
const args = process.argv.slice(2);
const recherche = args[0] || 'Marketing'; 
const lieu = args[1] || 'France'; 
const sourceChoisie = args[2] || "Bienvenue dans la jungle (France)";
const userEmail = args[3] || ""; 
const userApiKey = args[4] || "DEFAULT"; // NOUVEAU : La clé API transite ici

(async () => {
  const SPREADSHEET_ID = '1388cNk15MSeDpNXZgJTmze1vSTAskhFDPG2k5lUXH7I';
  const SHEET_TITLE = 'A_Faire';

  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_TITLE];

  // --- CORRECTION POUR LE SERVEUR STREAMLIT ---
  // Le mode headless et les arguments sont obligatoires sur Linux
  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();

  let urlCible = "";
  let selecteurJob = "";

  // --- LOGIQUE DE NAVIGATION ---
  if (sourceChoisie.includes("jungle")) {
    urlCible = `https://www.welcometothejungle.com/fr/jobs?query=${recherche}&aroundQuery=${lieu}`;
    selecteurJob = 'li.sc-688f8-1';
  } else if (sourceChoisie.includes("hackers")) {
    urlCible = `https://news.ycombinator.com/jobs`;
    selecteurJob = 'tr.athing';
  } else if (sourceChoisie.includes("Google")) {
    urlCible = `https://www.google.com/search?q=recrutement+${recherche}+${lieu}+contact+email`;
    selecteurJob = 'div.g';
  } else {
    urlCible = `https://www.welcometothejungle.com/fr/jobs?query=${recherche}&aroundQuery=${lieu}`;
    selecteurJob = 'li.sc-688f8-1';
  }

  console.log(`🔎 Mode Agent : Sourcing pour ${userEmail} sur ${sourceChoisie}...`);
  await page.goto(urlCible);

  try {
    await page.waitForSelector(selecteurJob, { timeout: 5000 });
    
    const jobs = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).slice(0, 3).map(card => ({
        titre: card.innerText.split('\n')[0],
        lien: card.querySelector('a')?.href
      }));
    }, selecteurJob);

    for (const job of jobs) {
      if (!job.lien) continue;
      console.log(`Analyse de l'opportunité pour ${userEmail}...`);
      await page.goto(job.lien, { waitUntil: 'domcontentloaded' });
      const contenu = await page.content();
      const emails = contenu.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/g);

      if (emails) {
        const contact = emails.filter(e => !e.includes('sentry') && !e.includes('wttj'))[0];
        if (contact) {
          // --- AJOUT AU SHEET AVEC L'EMAIL DE L'AMI ET LA CLÉ API ---
          await sheet.addRow({
            TITRE: `${job.titre} @ ${sourceChoisie}`,
            URL: job.lien,
            EMAIL: contact,
            DESTINATAIRE: userEmail,
            STATUT: 'A_ENVOYER',
            API_KEY: userApiKey // NOUVEAU : On écrit la clé dans la colonne F
          });
          console.log(`✅ Ligne ajoutée pour : ${userEmail}`);
        }
      }
    }
  } catch (e) {
    console.log("⚠️ Aucune offre trouvée ou format de page différent.");
  }

  console.log('🚀 Mission terminée. Données synchronisées.');
  await browser.close();
})();