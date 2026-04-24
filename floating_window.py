import webview

html_content = """
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            background-color: #0B0F1A;
            color: #E5E7EB;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            overflow: hidden;
            border: 1px solid #1F2937;
            border-radius: 12px;
            box-sizing: border-box;
            height: 100vh;
            display: flex;
            flex-direction: column;
            box-shadow: inset 0 0 20px rgba(124, 58, 237, 0.05);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            background-color: rgba(17, 24, 39, 0.8);
            border-bottom: 1px solid #1F2937;
            /* Allow dragging from header */
            -webkit-app-region: drag;
        }
        
        .title {
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            background: linear-gradient(135deg, #7C3AED, #22D3EE);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .close-btn {
            background: transparent;
            border: none;
            color: #6B7280;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            line-height: 1;
            /* Allow clicking close */
            -webkit-app-region: no-drag;
        }
        
        .close-btn:hover {
            color: #F38BA8;
        }
        
        .content {
            flex: 1;
            padding: 14px;
            overflow-y: auto;
            /* No drag inside content */
            -webkit-app-region: no-drag;
        }
        
        .loader {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #A78BFA;
            font-size: 12px;
            font-weight: 500;
        }
        
        .dot {
            width: 6px;
            height: 6px;
            background-color: #22D3EE;
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes ping {
            75%, 100% {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        ul {
            padding-left: 0;
            margin: 0;
            list-style: none;
        }
        
        li {
            margin-bottom: 12px;
            padding-left: 14px;
            position: relative;
            line-height: 1.5;
            color: #D1D5DB;
        }
        
        li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #7C3AED;
            font-weight: bold;
        }
        
        .refresh-btn {
            width: 100%;
            background-color: rgba(31, 41, 55, 0.5);
            color: #9CA3AF;
            border: 1px solid #374151;
            border-radius: 6px;
            padding: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.2s;
            -webkit-app-region: no-drag;
        }
        
        .refresh-btn:hover {
            background-color: rgba(124, 58, 237, 0.1);
            color: #A78BFA;
            border-color: rgba(124, 58, 237, 0.3);
        }

        /* Minimal scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">NeuroTrace</div>
        <button class="close-btn" onclick="window.close()">×</button>
    </div>
    <div class="content flex flex-col h-full">
        <div id="summary" style="flex: 1;">
            <div class="loader"><div class="dot"></div> Analyzing context...</div>
        </div>
        <button class="refresh-btn" onclick="fetchSummary()">Refresh</button>
    </div>

    <script>
        async function fetchSummary() {
            const summaryDiv = document.getElementById('summary');
            
            summaryDiv.innerHTML = '<div class="loader"><div class="dot"></div> Analyzing context...</div>';

            try {
                const response = await fetch('http://localhost:8000/summary');
                if (!response.ok) {
                    throw new Error('API error');
                }
                const data = await response.json();
                
                let html = '<ul>';
                if (Array.isArray(data.summary)) {
                    data.summary.forEach(item => {
                        html += `<li>${item}</li>`;
                    });
                } else if (data.summary) {
                    html += `<li>${data.summary}</li>`;
                } else {
                    html = "<div style='color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;'>No context available.</div>";
                }
                html += '</ul>';
                
                summaryDiv.innerHTML = html;
            } catch (error) {
                summaryDiv.innerHTML = '<div style="color: #F38BA8; font-size: 12px; text-align: center; margin-top: 20px;">Unable to reach Brain Core</div>';
            }
        }
        
        // Auto-fetch on load
        window.onload = fetchSummary;
        
        // Allow python script to inject close method
        function closeWindow() {
            if(window.pywebview) {
                window.pywebview.api.close();
            } else {
                window.close();
            }
        }
    </script>
</body>
</html>
"""

class API:
    def __init__(self, window):
        self.window = window

    def close(self):
        self.window.destroy()

if __name__ == '__main__':
    # Create a frameless, always-on-top window
    # easy_drag=True makes the entire frameless window draggable
    api = API(None)
    window = webview.create_window(
        'NeuroTrace Assistant',
        html=html_content,
        width=280,
        height=320,
        frameless=True,
        easy_drag=True,
        on_top=True,
        background_color='#0B0F1A',
        js_api=api
    )
    api.window = window
    
    # Start the webview application
    webview.start()
