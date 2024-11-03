from flask import Blueprint, request, jsonify, session, abort, render_template, redirect, url_for
from functools import wraps
from werkzeug.utils import secure_filename
from .utils import login_required, upload_file, generate_file_url, get_file_type, check_storage_limit, list_files, delete_file, get_storage_usage, quick_share, download_and_upload_file
from .config import ACCESS_CODES, WEBHOOK_URL
import os
import requests

main = Blueprint('main', __name__)

def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key not in ACCESS_CODES:
            abort(401)
        return f(*args, **kwargs)
    return decorated_function

@main.route('/')
@login_required
def index():
    storage_usage = get_storage_usage(session['access_code'])
    storage_limit = ACCESS_CODES[session['access_code']]['limit']
    storage_percentage = (storage_usage / storage_limit) * 100
    return render_template('index.html', storage_usage=storage_usage, storage_limit=storage_limit, storage_percentage=storage_percentage)

@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        code = request.form['code']
        if code in ACCESS_CODES:
            session['access_code'] = code
            return redirect(url_for('main.index'))
            send_webhook('Logged', f'{code}')
        return render_template('login.html', error='Invalid code')
    return render_template('login.html')

@main.route('/logout')
def logout():
    session.pop('access_code', None)
    return redirect(url_for('main.login'))

@main.route('/upload', methods=['POST'])
@login_required
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    within_limit, usage, limit = check_storage_limit(session['access_code'])
    if not within_limit:
        return jsonify({'error': 'Storage limit exceeded'}), 400

    try:
        file_url = upload_file(file, session['access_code'])
        send_webhook('File uploaded', f'File {file.filename} has been uploaded by ')
        return jsonify({'file_url': file_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/files', methods=['GET'])
@login_required
def api_list_files():
    files = list_files(session['access_code'])
    return jsonify({'files': files})

@main.route('/api/file/<path:filename>', methods=['DELETE'])
@login_required
def api_delete_file(filename):
    prefix = ACCESS_CODES[session['access_code']]['prefix']
    full_s3_key = f"{prefix}{filename}"
    if delete_file(full_s3_key):
        send_webhook('File deleted', f'File {filename} has been deleted by {prefix}')
        return jsonify({'message': 'File deleted successfully'})
    else:
        return jsonify({'error': 'File not found or could not be deleted'}), 404

@main.route('/api/storage-usage', methods=['GET'])
@login_required
def api_storage_usage():
    usage = get_storage_usage(session['access_code'])
    limit = ACCESS_CODES[session['access_code']]['limit']
    percentage = (usage / limit) * 100
    return jsonify({
        'usage': round(usage, 2),
        'limit': limit,
        'percentage': round(percentage, 2)
    })

@main.route('/api/quick-share', methods=['POST'])
@login_required
def api_quick_share():
    data = request.json
    file_url = data.get('file_url')
    if not file_url:
        return jsonify({'error': 'No file URL provided'}), 400

    try:
        share_url = quick_share(file_url, session['access_code'])
        send_webhook('Quick share created', f'A quick share link has been created for {file_url} by {prefix}')
        return jsonify({'share_url': share_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/v/<path:filename>')
def view_file(filename):
    prefix = ACCESS_CODES[session.get('access_code', 'default')]['prefix']
    full_s3_key = f"{prefix}{filename}"
    file_url = generate_file_url(full_s3_key)
    file_type = get_file_type(filename)
    return render_template('player.html', filename=filename, file_url=file_url, file_type=file_type)

@main.route('/api/torrent', methods=['POST'])
@login_required
def api_torrent_upload():
    data = request.json
    magnet_link = data.get('magnet_link')
    if not magnet_link:
        return jsonify({'error': 'No magnet link provided'}), 400

    try:
        file_url = download_and_upload_file(magnet_link, session['access_code'])
        send_webhook('Torrent uploaded', f'A file has been uploaded from a torrent by {prefix}')
        return jsonify({'file_url': file_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/api/upload', methods=['POST'])
@api_login_required
def api_upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    within_limit, usage, limit = check_storage_limit(session['access_code'])
    if not within_limit:
        return jsonify({'error': 'Storage limit exceeded'}), 400

    try:

        file_url = upload_file(file, session['access_code'])
        send_webhook('File uploaded', f'File {file.filename} has been uploaded by')
        return jsonify({'file_url': file_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def send_webhook(title, description):
    if WEBHOOK_URL:
        embed = {
            "title": title,
            "description": description,
            "color": 5814783 
        }
        data = {"embeds": [embed]}
        requests.post(WEBHOOK_URL, json=data)