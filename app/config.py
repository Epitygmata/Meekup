import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key_here'
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024 * 1024  # 5GB

S3_CONFIG = {
    'endpoint_url': ' ',
    'aws_access_key_id': ' ',
    'aws_secret_access_key': ' ',
    'region_name': ' '
}

BUCKET_NAME = ' '

ACCESS_CODES = {
    'sigma': {'limit': 500, 'prefix': 'sigma/', 'api_key': '0dpdp01092dPO&De'},
    'zaidzaid01!': {'limit': 100, 'prefix': 'tester/', 'api_key': '1d_ç98FE_çf90E'},
    'Meekiavelique': {'limit': 1000, 'prefix': 'meek/', 'api_key': 'MeekSecretApiKey'}
}

WEBHOOK_URL = ' '