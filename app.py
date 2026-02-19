import os
import json
import subprocess
import time
import pandas as pd
import streamlit as st

# --- 1. INSTALLATION AUTOMATIQUE NODE.JS ---
if not os.path.exists("node_modules"):
    subprocess.run(["npm", "install", "--legacy-peer-deps"])

st.set_page_config(page_title="IA-Hunter Pro", layout="wide")

st.title("🚀 IA-Hunter : Votre Assistant Recrutement")
st.write("Entrez vos critères et recevez vos candidatures personnalisées par email.")

# --- FORMULAIRE UTILISATEUR ---
with st.container():
    col1, col2 = st.columns(2)
    with col1:
        user_email = st.text_input("📩 Votre Email (pour recevoir la démo)", "exemple@gmail.com")
        domaine = st.text_input("💼 Domaine recherché", "Marketing")
        ville = st.text_input("📍 Ville / Région", "France")
    with col2:
        source = st.selectbox("🔍 Source de sourcing", [
            "Bienvenue dans la jungle (France)", 
            "Actualités des hackers (International)",
            "Recherche Google Directe (Partout)"
        ])
        api_key = st.text_input("🔑 Votre Clé Gemini (optionnel)", type="password")

# --- ACTION ---
if st.button("🔥 LANCER LE SOURCING ET RECEVOIR MON EMAIL IA"):
    if not user_email or "@" not in user_email:
        st.error("Veuillez entrer une adresse email valide.")
    else:
        with st.status("Initialisation du robot...", expanded=True) as status:
            st.write(f"🕵️ Recherche d'offres pour {user_email}...")
            
            # --- 2. CRÉATION DU FICHIER CREDENTIALS.JSON ---
            try:
                creds_dict = dict(st.secrets["gcp_service_account"])
                pk = str(creds_dict["private_key"])
                
                # Conversion absolue des sauts de ligne pour OpenSSL
                pk = pk.replace("\\n", "\n").replace("\\r", "")
                creds_dict["private_key"] = pk
                
                # Sécurité : on bloque le script si la clé est mal copiée
                if "-----BEGIN PRIVATE KEY-----" not in pk or "-----END PRIVATE KEY-----" not in pk:
                    st.error("❌ Erreur : La clé privée dans les Secrets Streamlit est incomplète ou mal copiée.")
                    st.stop()
                    
                with open("credentials.json", "w") as f:
                    json.dump(creds_dict, f)
            except Exception as e:
                st.error("❌ Erreur : Impossible de lire les Secrets Streamlit.")
                st.stop()
            
            # --- 3. LANCEMENT DU SCRIPT NODE.JS ---
            subprocess.run(["node", "index.js", domaine, ville, source, user_email])
            
            st.write("🤖 Rédaction et envoi de l'email personnalisé...")
            time.sleep(2) 
            
            status.update(label="Candidature envoyée !", state="complete", expanded=False)
        
        st.success(f"✅ Un email de démonstration a été envoyé à {user_email} !")
        st.balloons()

# --- APERÇU ---
st.divider()
st.subheader("📊 Dernières opportunités détectées")
try:
    df = pd.read_csv('candidatures_potentielles.csv')
    st.dataframe(df, width='stretch')
except Exception:
    st.info("Le tableau s'affichera après le premier sourcing.")