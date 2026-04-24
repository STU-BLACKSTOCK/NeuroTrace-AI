import webview

html_content = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 12px;
            background-color: #1e1e2e; /* Dark minimal theme */
            color: #cdd6f4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            overflow: hidden;
            border: 1px solid #313244;
            border-radius: 8px;
            box-sizing: border-box;
            height: 100vh;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        button {
            background-color: #cba6f7;
            color: #11111b;
            border: none;
            border-radius: 6px;
            padding: 8px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 10px;
            transition: opacity 0.2s;
            /* Allow clicking button without triggering drag */
            -webkit-app-region: no-drag; 
        }
        button:hover {
            opacity: 0.85;
        }
        #summary {
            flex: 1;
            overflow-y: auto;
            line-height: 1.4;
            /* Allow scrolling without triggering drag */
            -webkit-app-region: no-drag; 
            padding-right: 4px;
        }
        ul {
            padding-left: 18px;
            margin: 0;
        }
        li {
            margin-bottom: 6px;
        }
        /* Minimal scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #585b70; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
    </style>
</head>
<body>
    <div class="container">
        <button id="resumeBtn" onclick="fetchSummary()">🧠 Resume</button>
        <div id="summary">Ready. Click resume to fetch context.</div>
    </div>

    <script>
        async function fetchSummary() {
            const btn = document.getElementById('resumeBtn');
            const summaryDiv = document.getElementById('summary');
            
            btn.innerText = '⏳ Loading...';
            summaryDiv.innerHTML = '<span style="color: #a6adc8;">Fetching context...</span>';

            try {
                const response = await fetch('http://localhost:8000/summary');
                if (!response.ok) {
                    throw new Error('API error');
                }
                const data = await response.json();
                
                let html = '<ul>';
                // Backend returns a list of strings in data.summary
                if (Array.isArray(data.summary)) {
                    data.summary.forEach(item => {
                        html += `<li>${item}</li>`;
                    });
                } else if (data.summary) {
                    html += `<li>${data.summary}</li>`;
                } else {
                    html = "No summary available.";
                }
                html += '</ul>';
                
                summaryDiv.innerHTML = html;
            } catch (error) {
                summaryDiv.innerHTML = '<span style="color: #f38ba8;">Unable to fetch summary</span>';
            } finally {
                btn.innerText = '🧠 Resume';
            }
        }
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    # Create a frameless, always-on-top window
    # easy_drag=True makes the entire frameless window draggable
    window = webview.create_window(
        'NeuroTrace Assistant',
        html=html_content,
        width=260,
        height=200,
        frameless=True,
        easy_drag=True,
        on_top=True,
        background_color='#1e1e2e'
    )
    
    # Start the webview application
    webview.start()
