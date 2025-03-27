from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import srt
import os
import io
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static')

# Store the current files in memory
current_audio_data = None
current_audio_type = None

def get_audio_mime_type(filename):
    extension = os.path.splitext(filename)[1].lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg'
    }
    return mime_types.get(extension, 'audio/mpeg')

def parse_srt_content(content):
    return list(srt.parse(content.decode('utf-8')))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/upload', methods=['POST'])
def upload_files():
    global current_audio_data, current_audio_type
    
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
    
    try:
        # Clear previous audio data
        current_audio_data = None
        current_audio_type = None
        
        # Store new audio data in memory
        current_audio_data = audio_file.read()
        current_audio_type = get_audio_mime_type(audio_file.filename)
        
        # Read and parse subtitle content directly from memory
        subtitle_content = subtitle_file.read()
        subtitles = parse_srt_content(subtitle_content)
        
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
            'audio_url': '/audio/current'
        })
    except Exception as e:
        print(f"Error processing files: {str(e)}")
        return jsonify({'error': f'Error processing files: {str(e)}'}), 500

@app.route('/audio/current')
def serve_audio():
    global current_audio_data, current_audio_type
    if current_audio_data is None:
        return jsonify({'error': 'No audio file available'}), 404
    
    try:
        response = send_file(
            io.BytesIO(current_audio_data),
            mimetype=current_audio_type,
            as_attachment=False,
            conditional=True
        )
        # Add headers to prevent caching
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        print(f"Error serving audio: {str(e)}")
        return jsonify({'error': 'Error serving audio file'}), 500

# Required for Vercel
app = app

if __name__ == '__main__':
    app.run(debug=True) 