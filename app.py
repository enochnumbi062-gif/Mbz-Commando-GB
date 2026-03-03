import os
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # Flask va chercher automatiquement dans le dossier 'templates'
    return render_template('index.html')

if __name__ == '__main__':
    # Utilisation du port fourni par Render ou 5000 par défaut
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
