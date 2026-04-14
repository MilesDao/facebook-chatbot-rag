import urllib.request
import json

req = urllib.request.Request("http://localhost:8000/api/handoffs")
response = urllib.request.urlopen(req)
data = json.loads(response.read())

if data:
    handoff_id = data[0]['id']
    req2 = urllib.request.Request(f"http://localhost:8000/api/handoffs/{handoff_id}/chat-link")
    try:
        res2 = urllib.request.urlopen(req2)
        print(res2.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode()}")

