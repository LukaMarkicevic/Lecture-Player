from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import srt
import os
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import tempfile

app = Flask(__name__, static_folder='static')

# Store the current audio file and subtitle file paths
current_audio = None
current_srt = None

def get_audio_mime_type(filename):
    extension = os.path.splitext(filename)[1].lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg'
    }
    return mime_types.get(extension, 'audio/mpeg')

def parse_srt(srt_file):
    with open(srt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    return list(srt.parse(content))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/upload', methods=['POST'])
def upload_files():
    global current_audio, current_srt
    
    if 'audio' not in request.files or 'subtitle' not in request.files:
        return jsonify({'error': 'Both audio and subtitle files are required'}), 400
    
    audio_file = request.files['audio']
    subtitle_file = request.files['subtitle']
    
    if audio_file.filename == '' or subtitle_file.filename == '':
        return jsonify({'error': 'No selected files'}), 400
    
    # Validate audio file extension
    audio_ext = os.path.splitext(audio_file.filename)[1].lower()
    if audio_ext not in ['.mp3', '.m4a', '.wav', '.ogg']:
        return jsonify({'error': 'Unsupported audio format. Please use MP3, M4A, WAV, or OGG files.'}), 400
    
    # Save files temporarily with secure filenames
    current_audio = secure_filename(audio_file.filename)
    current_srt = secure_filename(subtitle_file.filename)
    
    # Create a temporary directory if it doesn't exist
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save files to temporary directory
    audio_path = os.path.join(temp_dir, current_audio)
    srt_path = os.path.join(temp_dir, current_srt)
    
    audio_file.save(audio_path)
    subtitle_file.save(srt_path)
    
    # Parse subtitles
    subtitles = parse_srt(srt_path)
    
    # Convert subtitles to a format suitable for the frontend
    formatted_subtitles = []
    for sub in subtitles:
        formatted_subtitles.append({
            'id': sub.index,
            'start': str(sub.start),
            'end': str(sub.end),
            'text': sub.content
        })
    
    return jsonify({
        'subtitles': formatted_subtitles,
        'audio_url': f'/audio/{current_audio}'
    })

@app.route('/audio/<filename>')
def serve_audio(filename):
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    audio_path = os.path.join(temp_dir, secure_filename(filename))
    if os.path.exists(audio_path):
        mime_type = get_audio_mime_type(filename)
        return send_file(audio_path, mimetype=mime_type)
    return jsonify({'error': 'No audio file available'}), 404

# Required for Vercel
app = app

if __name__ == '__main__':
    app.run(debug=True) 