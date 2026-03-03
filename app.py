import os
import time
from flask import Flask, render_template

app = Flask(__name__)

# Désactiver le cache interne de Flask
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.context_processor
def inject_version():
    # Génère un numéro de version unique basé sur l'heure actuelle
    # Cela permet de forcer la mise à jour du fichier engine.js
    return {'version': int(time.time())}

@app.route('/')
def index():
    """
    Sert la page principale de Mbz Commando GB. 
    """
    return render_template('index.html')

if __name__ == '__main__':
    # Configuration pour le déploiement sur Render
    port = int(os.environ.get("PORT", 5000))
    
    # host='0.0.0.0' est indispensable pour l'accès externe
    app.run(host='0.0.0.0', port=port)
