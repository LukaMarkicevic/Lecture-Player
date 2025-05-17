let subtitles = [];
let currentSubtitleIndex = -1;
const audioPlayer = document.getElementById('audioPlayer');
const videoPlayer = document.getElementById('videoPlayer');
const subtitleContainer = document.getElementById('subtitleContainer');
const playerSection = document.querySelector('.player-section');
const startButton = document.getElementById('startButton');
const fileSection = document.getElementById('fileSection');
let isFollowingText = false;
const followTextBtn = document.getElementById('followTextBtn');
const toggleFilesBtn = document.getElementById('toggleFilesBtn');
let groupingSeconds = 1;
const groupingInput = document.getElementById('groupingSeconds');
let currentPlayer = null;

// Update button state based on file selection
function updateUploadButton() {
    const mediaFile = document.getElementById('media').files[0];
    const subtitleFile = document.getElementById('subtitle').files[0];
    const mediaFileName = document.getElementById('mediaFileName');
    const subtitleFileName = document.getElementById('subtitleFileName');
    
    if (mediaFile) {
        mediaFileName.textContent = mediaFile.name;
        mediaFileName.style.display = 'block';
    } else {
        mediaFileName.style.display = 'none';
    }
    
    if (subtitleFile) {
        subtitleFileName.textContent = subtitleFile.name;
        subtitleFileName.style.display = 'block';
    } else {
        subtitleFileName.style.display = 'none';
    }
    
    startButton.disabled = !(mediaFile && subtitleFile);
    startButton.style.opacity = startButton.disabled ? '0.5' : '1';
}

// Handle file uploads
document.getElementById('media').addEventListener('change', updateUploadButton);
document.getElementById('subtitle').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            subtitles = parseSRT(event.target.result);
            updateUploadButton();
        } catch (error) {
            console.error('Error parsing SRT:', error);
            alert('Error parsing subtitle file. Please make sure it\'s a valid SRT file.');
        }
    };
    reader.readAsText(file);
});

// Start button click handler
startButton.addEventListener('click', async () => {
    const mediaFile = document.getElementById('media').files[0];
    if (!mediaFile) return;
    
    const mediaURL = URL.createObjectURL(mediaFile);
    const isVideo = mediaFile.type.startsWith('video/');
    
    // Hide both players initially
    audioPlayer.style.display = 'none';
    videoPlayer.style.display = 'none';
    
    // Set up the appropriate player
    if (isVideo) {
        videoPlayer.src = mediaURL;
        videoPlayer.style.display = 'block';
        currentPlayer = videoPlayer;
        document.querySelector('.player-container').classList.add('video-mode');
        document.querySelector('.container').classList.add('video-mode');
    } else {
        audioPlayer.src = mediaURL;
        audioPlayer.style.display = 'block';
        currentPlayer = audioPlayer;
        document.querySelector('.player-container').classList.remove('video-mode');
        document.querySelector('.container').classList.remove('video-mode');
    }
    
    playerSection.style.display = 'block';
    playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    fileSection.style.display = 'none';
    toggleFilesBtn.querySelector('span').textContent = '▼';
    
    if (subtitles && subtitles.length > 0) {
        renderSubtitles();
        setupMediaListeners();
        // Start playing automatically
        currentPlayer.play().catch(error => {
            console.log('Autoplay prevented:', error);
        });
    }
});

// Parse SRT content
function parseSRT(content) {
    const lines = content.split('\n');
    const subtitles = [];
    let currentSubtitle = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) {
            if (currentSubtitle && currentSubtitle.text) {
                currentSubtitle.text = currentSubtitle.text.trim();
                subtitles.push(currentSubtitle);
                currentSubtitle = null;
            }
            continue;
        }

        if (line.match(/^\d+$/)) {
            if (currentSubtitle && currentSubtitle.text) {
                currentSubtitle.text = currentSubtitle.text.trim();
                subtitles.push(currentSubtitle);
            }
            currentSubtitle = {
                id: parseInt(line),
                start: '',
                end: '',
                text: ''
            };
        } else if (line.includes('-->') && currentSubtitle) {
            const [start, end] = line.split('-->').map(t => t.trim());
            currentSubtitle.start = start;
            currentSubtitle.end = end;
        } else if (currentSubtitle) {
            currentSubtitle.text = (currentSubtitle.text + ' ' + line).trim();
        }
    }

    if (currentSubtitle && currentSubtitle.text) {
        currentSubtitle.text = currentSubtitle.text.trim();
        subtitles.push(currentSubtitle);
    }

    return subtitles;
}

// Convert time string to seconds
function timeToSeconds(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':');
    const [secs, ms] = seconds.split(',');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secs) + parseInt(ms) / 1000;
}

// Convert seconds to time string
function secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update subtitles display
function renderSubtitles() {
    const container = document.getElementById('subtitleContainer');
    container.innerHTML = '';
    
    if (!subtitles || subtitles.length === 0) {
        return;
    }

    // Group subtitles based on time window
    const groupedSubtitles = [];
    let currentGroup = [];
    let groupStartTime = null;
    const groupingTime = parseFloat(groupingInput.value) || 1;
    
    subtitles.forEach((sub, index) => {
        if (!sub || !sub.start || !sub.text) return;
        
        const startTime = timeToSeconds(sub.start);
        
        if (groupStartTime === null) {
            groupStartTime = startTime;
            currentGroup = [{ ...sub, index }];
        } else if (startTime - groupStartTime <= groupingTime) {
            currentGroup.push({ ...sub, index });
        } else {
            if (currentGroup.length > 0) {
                groupedSubtitles.push({
                    text: currentGroup.map(s => s.text.trim()).join(' '),
                    start: currentGroup[0].start,
                    end: currentGroup[currentGroup.length - 1].end,
                    indices: currentGroup.map(s => s.index)
                });
            }
            currentGroup = [{ ...sub, index }];
            groupStartTime = startTime;
        }
    });
    
    // Add the last group if it exists
    if (currentGroup.length > 0) {
        groupedSubtitles.push({
            text: currentGroup.map(s => s.text.trim()).join(' '),
            start: currentGroup[0].start,
            end: currentGroup[currentGroup.length - 1].end,
            indices: currentGroup.map(s => s.index)
        });
    }
    
    // Render grouped subtitles
    groupedSubtitles.forEach((group, groupIndex) => {
        const div = document.createElement('div');
        div.className = 'subtitle-item';
        div.dataset.startTime = timeToSeconds(group.start);
        div.dataset.endTime = timeToSeconds(group.end);
        div.dataset.groupIndex = groupIndex;
        
        // Format timestamps without milliseconds
        const startTime = group.start.split(',')[0];
        const endTime = group.end.split(',')[0];
        
        div.innerHTML = `
            <div class="text">${group.text}</div>
            <div class="timestamp">${startTime} → ${endTime}</div>
        `;
        
        div.onclick = () => {
            const startTime = timeToSeconds(group.start);
            if (currentPlayer && !isNaN(startTime)) {
                currentPlayer.currentTime = startTime;
                currentPlayer.play().catch(console.error);
                highlightCurrentSubtitle(groupIndex);
            }
        };
        
        container.appendChild(div);
    });
}

function setupMediaListeners() {
    currentPlayer.addEventListener('timeupdate', () => {
        const currentTime = currentPlayer.currentTime;
        updateActiveSubtitle(currentTime);
    });
}

function updateActiveSubtitle(currentTime) {
    const subtitleItems = document.querySelectorAll('.subtitle-item');
    let activeFound = false;

    subtitleItems.forEach((item) => {
        const startTime = parseFloat(item.dataset.startTime);
        const endTime = parseFloat(item.dataset.endTime);
        const groupIndex = parseInt(item.dataset.groupIndex);

        if (currentTime >= startTime && currentTime <= endTime) {
            if (!item.classList.contains('active')) {
                highlightCurrentSubtitle(groupIndex);
            }
            activeFound = true;
        } else {
            item.classList.remove('active');
        }
    });

    // If following text is enabled and we found an active subtitle
    if (isFollowingText && activeFound) {
        const activeItem = document.querySelector('.subtitle-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function highlightCurrentSubtitle(index) {
    const subtitleItems = document.querySelectorAll('.subtitle-item');
    subtitleItems.forEach((item) => item.classList.remove('active'));
    
    const currentItem = subtitleItems[index];
    if (currentItem) {
        currentItem.classList.add('active');
        if (isFollowingText) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Follow text button handler
followTextBtn.addEventListener('click', () => {
    isFollowingText = !isFollowingText;
    followTextBtn.classList.toggle('active');
    followTextBtn.querySelector('span').textContent = isFollowingText ? 'Following Text' : 'Follow Text';
    
    if (isFollowingText) {
        const activeItem = document.querySelector('.subtitle-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
});

// Grouping input handler
groupingInput.addEventListener('change', () => {
    groupingSeconds = Math.max(1, Math.min(60, parseInt(groupingInput.value) || 1));
    groupingInput.value = groupingSeconds;
    renderSubtitles();
});

// Toggle files button handler
toggleFilesBtn.addEventListener('click', () => {
    fileSection.style.display = fileSection.style.display === 'none' ? 'block' : 'none';
    toggleFilesBtn.querySelector('span').textContent = fileSection.style.display === 'none' ? '▼' : '▲';
});

// Search functionality
const searchInput = document.getElementById('searchInput');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const subtitleItems = document.querySelectorAll('.subtitle-item');
        
        subtitleItems.forEach(item => {
            const text = item.querySelector('.text').textContent.toLowerCase();
            const timestamp = item.querySelector('.timestamp').textContent.toLowerCase();
            
            // Remove previous highlights
            item.classList.remove('highlight');
            
            if (searchTerm === '') {
                // If search is empty, show all items
                item.classList.remove('hidden');
            } else if (text.includes(searchTerm) || timestamp.includes(searchTerm)) {
                // Show and highlight matching items
                item.classList.remove('hidden');
                item.classList.add('highlight');
                
                // If following text is enabled, scroll to the first match
                if (isFollowingText && !item.classList.contains('active')) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                // Hide non-matching items
                item.classList.add('hidden');
            }
        });
    }, 300); // Debounce search for better performance
});

// Clear search when starting new playback
startButton.addEventListener('click', () => {
    searchInput.value = '';
    const subtitleItems = document.querySelectorAll('.subtitle-item');
    subtitleItems.forEach(item => {
        item.classList.remove('highlight', 'hidden');
    });
});