from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
from datetime import datetime
import time

# Firebase REST API URL
FIREBASE_DATABASE_URL = "https://subscription-api-service-default-rtdb.asia-southeast1.firebasedatabase.app"

def get_firebase_data(path):
    """Get data from Firebase using REST API"""
    try:
        url = f"{FIREBASE_DATABASE_URL}/{path}.json"
        req = urllib.request.Request(url)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Error getting Firebase data: {e}")
        return None

def update_firebase_data(path, data):
    """Update data in Firebase using REST API"""
    try:
        url = f"{FIREBASE_DATABASE_URL}/{path}.json"
        json_data = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(url, data=json_data, method='PATCH')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"Error updating Firebase data: {e}")
        return False

def push_firebase_data(path, data):
    """Push data to Firebase using REST API"""
    try:
        url = f"{FIREBASE_DATABASE_URL}/{path}.json"
        json_data = json.dumps(data).encode('utf-8')
        
        req = urllib.request.Request(url, data=json_data, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"Error pushing Firebase data: {e}")
        return False

def call_external_api(uid):
    """Call external API for given UID"""
    try:
        external_api_url = f"https://narayan-like-api-wine.vercel.app/{uid}/ind/xyz"
        
        req = urllib.request.Request(external_api_url, method='GET')
        req.add_header('User-Agent', 'Mozilla/5.0 (Daily Automation Bot)')
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
            
            return {
                'success': True,
                'data': api_result,
                'status_code': response.status,
                'timestamp': datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

def run_daily_automation():
    """Main automation function"""
    print(f"Starting daily automation at {datetime.utcnow().isoformat()}")
    
    try:
        users_data = get_firebase_data('users')
        
        if not users_data:
            return {
                'success': True,
                'message': 'No users found',
                'processed_count': 0
            }
        
        processed_count = 0
        success_count = 0
        error_count = 0
        
        for user_id, user_data in users_data.items():
            try:
                if (user_data.get('paymentStatus') == True and user_data.get('uid')):
                    uid = user_data['uid']
                    print(f"Processing user {user_id} with UID {uid}")
                    
                    api_result = call_external_api(uid)
                    
                    update_data = {
                        'lastApiCall': datetime.utcnow().isoformat(),
                        'lastAutomationResult': api_result
                    }
                    
                    update_firebase_data(f'users/{user_id}', update_data)
                    
                    history_entry = {
                        'timestamp': datetime.utcnow().isoformat(),
                        'result': api_result,
                        'type': 'automated'
                    }
                    
                    push_firebase_data(f'users/{user_id}/apiResults', history_entry)
                    
                    processed_count += 1
                    
                    if api_result.get('success'):
                        success_count += 1
                    else:
                        error_count += 1
                    
                    time.sleep(1)
                    
            except Exception as e:
                print(f"Error processing user {user_id}: {e}")
                error_count += 1
                continue
        
        summary = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_processed': processed_count,
            'successful_calls': success_count,
            'failed_calls': error_count
        }
        
        push_firebase_data('automation_logs', summary)
        
        return {
            'success': True,
            'message': 'Daily automation completed',
            'summary': summary
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        result = run_daily_automation()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
    
    def do_POST(self):
        result = run_daily_automation()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
