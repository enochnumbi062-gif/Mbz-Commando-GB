import os
from flask import Flask, render_template

app = Flask(__name__)

# Désactiver le cache pour que vos changements sur engine.js soient instantanés
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route('/')
def index():
    """
    Sert la page principale du jeu. 
    Flask cherche automatiquement le fichier 'index.html' dans le dossier /templates.
    """
    return render_template('index.html')

if __name__ == '__main__':
    # Configuration vitale pour le déploiement :
    # Render attribue un PORT dynamiquement, nous devons le récupérer.
    port = int(os.environ.get("PORT", 5000))
    
    # host='0.0.0.0' permet au serveur d'être visible sur le web
    app.run(host='0.0.0.0', port=port)
