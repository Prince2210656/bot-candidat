const puppeteer = require('puppeteer');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./credentials.json');

const args = process.argv.slice(2);
const recherche = args[0] || 'Marketing'; 
const lieu = args[1] || 'France'; 
const sourceChoisie = args[2] || "Bienvenue dans la jungle (France)";
const userEmail = args[3] || ""; 
const userApiKey = args[4] || "DEFAULT";

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

  const browser = await puppeteer.launch({ 
    headless: "new", 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  // On simule un vrai navigateur pour éviter d'être bloqué
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

  let urlCible = "";
  let selecteurJob = "";

  if (sourceChoisie.includes("jungle")) {
    urlCible = `https://www.welcometothejungle.com/fr/jobs?query=${recherche}&aroundQuery=${lieu}`;
    // Sélecteur plus robuste pour WTTJ
    selecteurJob = 'li[data-testid="search-results-list-item-wrapper"], article';
  } else if (sourceChoisie.includes("hackers")) {
    urlCible = `https://news.ycombinator.com/jobs`;
    selecteurJob = 'tr.athing';
  } else {
    urlCible = `https://www.google.com/search?q=recrutement+${recherche}+${lieu}+contact+email`;
    selecteurJob = 'div.g';
  }

  console.log(`🔎 Mode Agent : Sourcing pour ${userEmail} sur ${sourceChoisie}...`);
  
  try {
    await page.goto(urlCible, { waitUntil: 'networkidle2' });
    await page.waitForSelector(selecteurJob, { timeout: 10000 });
    
    const jobs = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).slice(0, 3).map(card => ({
        titre: card.innerText.split('\n')[0].substring(0, 50),
        lien: card.querySelector('a')?.href
      }));
    }, selecteurJob);

    console.log(`🎯 ${jobs.length} opportunités potentielles trouvées.`);

    for (const job of jobs) {
      if (!job.lien || job.lien.includes('google.com/search')) continue;
      
      console.log(`🔗 Analyse de : ${job.titre}...`);
      try {
        await page.goto(job.lien, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const contenu = await page.content();
        
        // Regex email améliorée
        const emails = contenu.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);

        if (emails) {
          const contact = emails.filter(e => !/sentry|wttj|example|format|domain/i.test(e))[0];
          if (contact) {
            await sheet.addRow({
              TITRE: `${job.titre} @ ${sourceChoisie}`,
              URL: job.lien,
              EMAIL: contact,
              DESTINATAIRE: userEmail,
              STATUT: 'A_ENVOYER',
              API_KEY: userApiKey
            });
            console.log(`✅ Ligne ajoutée pour : ${contact}`);
          }
        }
      } catch (e) {
        console.log(`❌ Impossible d'analyser le lien : ${job.lien}`);
      }
    }
  } catch (e) {
    console.log("⚠️ Erreur lors du scraping ou aucune offre trouvée.");
  }

  // --- MODE DEBUG : FORCE UNE LIGNE POUR VÉRIFIER LA CONNEXION ---
  console.log("🛠️ Envoi d'une ligne de test pour vérifier le Sheet...");
  await sheet.addRow({
    TITRE: "VÉRIFICATION SYSTÈME",
    URL: "https://ia-hunter.streamlit.app",
    EMAIL: "verif@system.com",
    DESTINATAIRE: userEmail,
    STATUT: 'A_ENVOYER',
    API_KEY: userApiKey
  });

  console.log('🚀 Mission terminée.');
  await browser.close();
})();