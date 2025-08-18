from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                body = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response(400, 'Invalid JSON in request body')
                return
            
            uid = body.get('uid')
            if not uid:
                self.send_error_response(400, 'UID is required')
                return
            
            # Call external API
            external_api_url = f"https://narayan-like-api-wine.vercel.app/{uid}/ind/xyz"
            
            try:
                req = urllib.request.Request(external_api_url, method='GET')
                req.add_header('User-Agent', 'Mozilla/5.0 (API Service Bot)')
                req.add_header('Accept', 'application/json')
                
                with urllib.request.urlopen(req, timeout=30) as response:
                    response_data = response.read()
                    
                    try:
                        api_result = json.loads(response_data.decode('utf-8'))
                    except json.JSONDecodeError:
                        api_result = {
                            'response': response_data.decode('utf-8'),
                            'content_type': response.headers.get('Content-Type', 'text/plain')
                        }
                    
                    result = {
                        'success': True,
                        'timestamp': datetime.utcnow().isoformat(),
                        'uid': uid,
                        'data': api_result,
                        'api_url': external_api_url,
                        'status_code': response.status
                    }
                    
                    self.send_success_response(result)
                    
            except urllib.error.HTTPError as e:
                result = {
                    'success': False,
                    'timestamp': datetime.utcnow().isoformat(),
                    'uid': uid,
                    'error': f"HTTP {e.code}: {e.reason}",
                    'api_url': external_api_url,
                    'status_code': e.code
                }
                self.send_success_response(result)
                
            except Exception as e:
                result = {
                    'success': False,
                    'timestamp': datetime.utcnow().isoformat(),
                    'uid': uid,
                    'error': str(e),
                    'api_url': external_api_url
                }
                self.send_success_response(result)
                
        except Exception as e:
            self.send_error_response(500, f'Internal server error: {str(e)}')
    
    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_data = {
            'error': message,
            'timestamp': datetime.utcnow().isoformat()
        }
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
