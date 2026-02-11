import streamlit as st
import subprocess
import pandas as pd
import time

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
            
            # On envoie les 4 arguments au robot Node.js
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
    st.dataframe(df, width='stretch') # Corrigé pour 2026
except Exception:
    st.info("Le tableau s'affichera après le premier sourcing.")