import os
import uuid
import mimetypes
from functools import wraps
from flask import redirect, session, abort
from werkzeug.utils import secure_filename
import boto3
from botocore.exceptions import ClientError
import logging
import requests
from PyBitTorrent import TorrentClient
import tempfile
import time
from .config import S3_CONFIG, BUCKET_NAME, ACCESS_CODES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

s3 = boto3.client('s3', **S3_CONFIG)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'access_code' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function

def upload_file(file, access_code):
    filename = secure_filename(file.filename)
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{filename.split('.')[0]}_{uuid.uuid4().hex[:8]}{file_extension}"
    
    prefix = ACCESS_CODES[access_code]['prefix']
    s3_key = f"{prefix}{unique_filename}"

    content_type, _ = mimetypes.guess_type(filename)
    if content_type is None:
        content_type = 'application/octet-stream'

    s3.upload_fileobj(
        file,
        BUCKET_NAME,
        s3_key,
        ExtraArgs={'ContentType': content_type}
    )

    logger.info(f"Uploaded: {filename} as {s3_key}")
    return f"/v/{unique_filename}"

def generate_file_url(s3_key):
    return s3.generate_presigned_url('get_object',
                                     Params={'Bucket': BUCKET_NAME,
                                             'Key': s3_key},
                                     ExpiresIn=3600)

def get_file_type(filename):
    _, extension = os.path.splitext(filename)
    extension = extension.lower()

    if extension in ['.mp4', '.webm', '.ogg']:
        return 'video'
    elif extension in ['.mp3', '.wav']:
        return 'audio'
    elif extension in ['.zip', '.rar', '.7z']:
        return 'archive'
    elif extension in ['.txt', '.py', '.js', '.html', '.css']:
        return 'code'
    elif extension in ['.jpg', '.jpeg', '.png', '.gif']:
        return 'image'
    elif extension in ['.pdf']:
        return 'pdf'
    else:
        return 'other'

def get_storage_usage(access_code):
    prefix = ACCESS_CODES[access_code]['prefix']
    total_size = 0
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            total_size += obj['Size']
    return total_size / (1024 * 1024 * 1024)  

def check_storage_limit(access_code):
    usage = get_storage_usage(access_code)
    limit = ACCESS_CODES[access_code]['limit']
    return usage < limit, usage, limit

def list_files(access_code):
    prefix = ACCESS_CODES[access_code]['prefix']
    files = []
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            files.append(obj['Key'].replace(prefix, '', 1))
    return files

def delete_file(s3_key):
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False

def quick_share(file_url, access_code):
    response = requests.get(file_url, stream=True)
    if response.status_code == 200:
        filename = file_url.split('/')[-1]
        file_obj = response.raw
        file_obj.decode_content = True
        return upload_file(file_obj, access_code)
    else:
        raise Exception("Failed to download the file")

def download_and_upload_file(magnet_link, access_code):
    with tempfile.TemporaryDirectory() as temp_dir:
        client = TorrentClient(
            torrent=magnet_link,
            max_peers=12,
            use_progress_bar=False,
            output_dir=temp_dir
        )

        print('Starting torrent download...')
        client.start()

        print('\nDownload complete')
        
        downloaded_files = os.listdir(temp_dir)
        if not downloaded_files:
            raise Exception("No files were downloaded")
        
        file_path = os.path.join(temp_dir, downloaded_files[0])
        with open(file_path, 'rb') as f:
            file_url = upload_file(f, access_code)

    return file_url