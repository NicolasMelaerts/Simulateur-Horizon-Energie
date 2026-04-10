import os
import google.generativeai as genai

# Ta clé API est automatiquement récupérée ici
API_KEY = "AIzaSyBxHQYzTi2xSXwAcI5hpkotwQXLAo3mJ-k"

def test_gemini():
    print(f"Tentative de connexion avec la clé : {API_KEY[:10]}...")
    
    try:
        genai.configure(api_key=API_KEY)
        
        # Liste et test
        print("\n🔍 Liste des modèles disponibles :")
        for m in genai.list_models():
            print(f" - {m.name}")
        
        # On utilise l'alias recommandé par Google pour plus de stabilité
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content("Dis 'La clé fonctionne !'")
        
        print(f"\n✅ TEST GÉNÉRATION : {response.text}")
            
    except Exception as e:
        print(f"\n❌ ERREUR : {str(e)}")
        print("\nVérifiez que :")
        print("1. La clé est correcte.")
        print("2. Vous avez activé l'API Gemini dans Google AI Studio.")
        print("3. Vous avez installé le package : pip install google-generativeai")

if __name__ == "__main__":
    test_gemini()
