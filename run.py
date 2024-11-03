from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from app.routes import main  
from app.config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    app.register_blueprint(main)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host="0.0.0.0", port=12312, debug=False)
