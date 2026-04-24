import tkinter as tk
from tkinter import messagebox
import requests
import webbrowser
import threading
import socket
import sys

# Prevent multiple instances using a socket port bind
try:
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    lock_socket.bind(("127.0.0.1", 47291))
except socket.error:
    print("Widget is already running.")
    sys.exit(0)

API_URL = "http://localhost:8000/summary"
DASHBOARD_URL = "http://localhost:3000"

# Colors matching the dark premium theme
BG_COLOR = "#0B0F1A"
CARD_COLOR = "#111827"
TEXT_COLOR = "#D1D5DB"
PRIMARY_COLOR = "#7C3AED"
SECONDARY_COLOR = "#22D3EE"
ERROR_COLOR = "#F38BA8"
BORDER_COLOR = "#1F2937"

class FloatingAssistant:
    def __init__(self, root):
        self.root = root
        self.root.title("NeuroTrace Assistant")
        self.root.geometry("280x320")
        self.root.overrideredirect(True) # Frameless
        self.root.attributes("-topmost", True) # Always on top
        self.root.configure(bg=BORDER_COLOR) # Thin border color
        
        # Inner Frame for actual content
        self.main_frame = tk.Frame(self.root, bg=BG_COLOR, bd=0)
        self.main_frame.pack(fill="both", expand=True, padx=1, pady=1)

        self._drag_data = {"x": 0, "y": 0}

        self.setup_ui()
        self.center_window(280, 320)
        
        # Icon Window (Hidden initially)
        self.setup_icon_window()

    def setup_ui(self):
        # Header bar (draggable)
        self.header = tk.Frame(self.main_frame, bg=CARD_COLOR, height=35)
        self.header.pack(fill="x", side="top")
        self.header.pack_propagate(False)
        
        # Drag bindings
        self.header.bind("<ButtonPress-1>", self.on_drag_start)
        self.header.bind("<B1-Motion>", self.on_drag_motion)
        
        # Title
        tk.Label(
            self.header, text="NEUROTRACE", bg=CARD_COLOR, fg=SECONDARY_COLOR, 
            font=("Segoe UI", 10, "bold"), cursor="fleur"
        ).pack(side="left", padx=10)
        self.header.children["!label"].bind("<ButtonPress-1>", self.on_drag_start)
        self.header.children["!label"].bind("<B1-Motion>", self.on_drag_motion)

        # Controls [ ➖ ] [ ⛶ ] [ ❌ ]
        ctrl_frame = tk.Frame(self.header, bg=CARD_COLOR)
        ctrl_frame.pack(side="right", padx=5)

        btn_style = {"bg": CARD_COLOR, "fg": TEXT_COLOR, "bd": 0, "font": ("Segoe UI", 10, "bold"), "activebackground": BORDER_COLOR, "activeforeground": "white", "cursor": "hand2"}

        btn_min = tk.Button(ctrl_frame, text="➖", command=self.minimize_to_icon, **btn_style)
        btn_min.pack(side="left", padx=2)
        
        btn_max = tk.Button(ctrl_frame, text="⛶", command=self.open_dashboard, **btn_style)
        btn_max.pack(side="left", padx=2)
        
        btn_close = tk.Button(ctrl_frame, text="❌", command=self.close_app, **btn_style)
        btn_close.pack(side="left", padx=2)
        
        # Content Area
        self.content_frame = tk.Frame(self.main_frame, bg=BG_COLOR)
        self.content_frame.pack(fill="both", expand=True, padx=15, pady=10)

        # Action Button
        self.btn_fetch = tk.Button(
            self.content_frame, text="🧠 Extract Context", bg=PRIMARY_COLOR, fg="white", 
            bd=0, font=("Segoe UI", 10, "bold"), cursor="hand2", command=self.fetch_summary,
            activebackground="#5B21B6", activeforeground="white", pady=5
        )
        self.btn_fetch.pack(fill="x", pady=(0, 10))

        # Text Area
        self.text_area = tk.Text(
            self.content_frame, bg=CARD_COLOR, fg=TEXT_COLOR, font=("Segoe UI", 10), 
            wrap="word", bd=0, padx=10, pady=10, state=tk.DISABLED
        )
        self.text_area.pack(fill="both", expand=True)

        self.display_text("Ready. Click to fetch context.")

    def setup_icon_window(self):
        self.icon_win = tk.Toplevel(self.root)
        self.icon_win.overrideredirect(True)
        self.icon_win.attributes("-topmost", True)
        self.icon_win.geometry("50x50")
        self.icon_win.withdraw() # Hide initially
        
        # Try to use transparent color trick if on Windows
        try:
            self.icon_win.attributes("-transparentcolor", "black")
            bg_color = "black"
        except tk.TclError:
            bg_color = BG_COLOR
            
        self.icon_win.configure(bg=bg_color)
        
        # The circular/square button
        icon_btn = tk.Button(
            self.icon_win, text="🧠", font=("Segoe UI", 20), bg=PRIMARY_COLOR, fg="white",
            bd=0, activebackground="#5B21B6", cursor="hand2", command=self.restore_from_icon
        )
        # Pack to fill, simulating a floating circle if rounded corners aren't perfectly native
        icon_btn.place(relx=0.5, rely=0.5, anchor="center", width=46, height=46)
        
        # Bind dragging to the icon window too
        self._icon_drag_data = {"x": 0, "y": 0}
        icon_btn.bind("<ButtonPress-1>", self.on_icon_drag_start)
        icon_btn.bind("<B1-Motion>", self.on_icon_drag_motion)

    # --- Window Dragging Logic ---
    def on_drag_start(self, event):
        self._drag_data["x"] = event.x
        self._drag_data["y"] = event.y

    def on_drag_motion(self, event):
        x = self.root.winfo_x() - self._drag_data["x"] + event.x
        y = self.root.winfo_y() - self._drag_data["y"] + event.y
        self.root.geometry(f"+{x}+{y}")

    def on_icon_drag_start(self, event):
        self._icon_drag_data["x"] = event.x
        self._icon_drag_data["y"] = event.y

    def on_icon_drag_motion(self, event):
        x = self.icon_win.winfo_x() - self._icon_drag_data["x"] + event.x
        y = self.icon_win.winfo_y() - self._icon_drag_data["y"] + event.y
        self.icon_win.geometry(f"+{x}+{y}")

    # --- State Management ---
    def minimize_to_icon(self):
        self.root.withdraw()
        # Position icon at bottom right
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        self.icon_win.geometry(f"50x50+{screen_w - 80}+{screen_h - 100}")
        self.icon_win.deiconify()

    def restore_from_icon(self):
        self.icon_win.withdraw()
        self.root.deiconify()

    def open_dashboard(self):
        webbrowser.open(DASHBOARD_URL)

    def close_app(self):
        self.root.destroy()

    def center_window(self, width, height):
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        x = (screen_w // 2) - (width // 2)
        y = (screen_h // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    # --- Fetch Logic ---
    def display_text(self, text, is_error=False):
        self.text_area.config(state=tk.NORMAL)
        self.text_area.delete(1.0, tk.END)
        self.text_area.insert(tk.END, text)
        if is_error:
            self.text_area.config(fg=ERROR_COLOR)
        else:
            self.text_area.config(fg=TEXT_COLOR)
        self.text_area.config(state=tk.DISABLED)

    def fetch_summary(self):
        self.btn_fetch.config(text="⏳ Fetching...", state=tk.DISABLED)
        self.display_text("Connecting to Brain Core...\nAnalyzing session...")
        
        # Run in thread to not block UI
        threading.Thread(target=self._fetch_task, daemon=True).start()

    def _fetch_task(self):
        try:
            response = requests.get(API_URL, timeout=10)
            if response.status_code == 200:
                data = response.json()
                summary_data = data.get("summary", [])
                
                output = ""
                if isinstance(summary_data, list):
                    for line in summary_data:
                        output += f"• {line}\n\n"
                elif summary_data:
                    output = f"• {summary_data}"
                else:
                    output = "No context available."
                
                # Update UI safely
                self.root.after(0, lambda: self.display_text(output.strip()))
            else:
                self.root.after(0, lambda: self.display_text("Unable to fetch summary (Bad Response)", is_error=True))
        except Exception as e:
            self.root.after(0, lambda: self.display_text("Unable to fetch summary (Connection Failed)", is_error=True))
        finally:
            self.root.after(0, lambda: self.btn_fetch.config(text="🧠 Extract Context", state=tk.NORMAL))

if __name__ == "__main__":
    root = tk.Tk()
    app = FloatingAssistant(root)
    # Auto-fetch on load
    app.fetch_summary()
    root.mainloop()
