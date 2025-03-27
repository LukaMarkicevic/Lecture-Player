from flask import Flask, render_template, request, jsonify, send_file
import srt
import os
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Store the current audio file and subtitle file paths
current_audio = None
current_srt = None

def parse_srt(srt_file):
    with open(srt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    return list(srt.parse(content))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    global current_audio, current_srt
    
    if 'audio' not in request.files or 'subtitle' not in request.files:
        return jsonify({'error': 'Both audio and subtitle files are required'}), 400
    
    audio_file = request.files['audio']
    subtitle_file = request.files['subtitle']
    
    if audio_file.filename == '' or subtitle_file.filename == '':
        return jsonify({'error': 'No selected files'}), 400
    
    # Save files temporarily with secure filenames
    current_audio = secure_filename(audio_file.filename)
    current_srt = secure_filename(subtitle_file.filename)
    
    # Save files to /tmp directory (required for Vercel)
    audio_path = os.path.join('/tmp', current_audio)
    srt_path = os.path.join('/tmp', current_srt)
    
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
    audio_path = os.path.join('/tmp', secure_filename(filename))
    if os.path.exists(audio_path):
        return send_file(audio_path, mimetype='audio/mpeg')
    return jsonify({'error': 'No audio file available'}), 404

# Required for Vercel
app = app

if __name__ == '__main__':
    app.run(debug=True) 