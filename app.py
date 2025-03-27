from flask import Flask, render_template, request, jsonify, send_file
import srt
import os
from datetime import datetime, timedelta

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
    
    # Save files temporarily
    current_audio = 'temp_audio.mp3'
    current_srt = 'temp_subtitle.srt'
    
    audio_file.save(current_audio)
    subtitle_file.save(current_srt)
    
    # Parse subtitles
    subtitles = parse_srt(current_srt)
    
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
        'audio_url': '/audio'
    })

@app.route('/audio')
def serve_audio():
    if current_audio and os.path.exists(current_audio):
        return send_file(current_audio, mimetype='audio/mpeg')
    return jsonify({'error': 'No audio file available'}), 404

if __name__ == '__main__':
    app.run(debug=True) 