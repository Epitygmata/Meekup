document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadedList = document.getElementById('uploadedList');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const footerJoke = document.getElementById('footerJoke');
    const codeEditor = document.getElementById('codeEditor');
    const codeArea = document.getElementById('codeArea');

    const quickShareInput = document.getElementById('quickShareInput');
    const quickShareButton = document.getElementById('quickShareButton');
    const quickShareResult = document.getElementById('quickShareResult');

    const torrentInput = document.getElementById('torrentInput');
    const torrentButton = document.getElementById('torrentButton');
    const torrentResult = document.getElementById('torrentResult');

    if (quickShareButton) {
        quickShareButton.addEventListener('click', handleQuickShare);
    }

    if (torrentButton) {
        torrentButton.addEventListener('click', handleTorrentUpload);
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileInputChange);
    }

    if (uploadButton) {
        uploadButton.addEventListener('click', uploadFile);
    }

    let editor;
    if (codeArea) {
        editor = CodeMirror.fromTextArea(codeArea, {
            lineNumbers: true,
            mode: "javascript",
            theme: "default"
        });
    }

    const jokes = [
        "Imagine using google drive lol",
        "Parkour pro, or pvp boss...",
        "Mojang EULA"
    ];

    function updateFooterJoke() {
        if (footerJoke) {
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            footerJoke.textContent = randomJoke;
        }
    }

    updateFooterJoke();
    setInterval(updateFooterJoke, 30000);

    function handleFileInputChange(e) {
        if (e.target.files.length > 0 && uploadButton) {
            uploadButton.textContent = `Sned Up ${e.target.files[0].name}`;
        }
    }

    function handleQuickShare() {
        if (!quickShareInput || !quickShareResult) return;

        const fileUrl = quickShareInput.value.trim();
        if (fileUrl) {
            fetch('/api/quick-share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_url: fileUrl }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.share_url) {
                    quickShareResult.textContent = `Quick share link: ${data.share_url}`;
                    quickShareResult.className = 'mt-2 text-sm text-emerald-600';
                } else {
                    quickShareResult.textContent = 'Error creating quick share link.';
                    quickShareResult.className = 'mt-2 text-sm text-red-600';
                }
            })
            .catch(error => {
                quickShareResult.textContent = 'Error: ' + error;
                quickShareResult.className = 'mt-2 text-sm text-red-600';
            });
        } else {
            quickShareResult.textContent = 'Please enter a valid file URL.';
            quickShareResult.className = 'mt-2 text-sm text-red-600';
        }
    }

    function handleTorrentUpload() {
        if (!torrentInput || !torrentResult) return;

        const magnetLink = torrentInput.value.trim();
        if (magnetLink) {
            fetch('/api/torrent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet_link: magnetLink }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.file_url) {
                    torrentResult.textContent = `Torrent uploaded successfully: ${data.file_url}`;
                    torrentResult.className = 'mt-2 text-sm text-emerald-600';
                } else {
                    torrentResult.textContent = 'Error uploading torrent.';
                    torrentResult.className = 'mt-2 text-sm text-red-600';
                }
            })
            .catch(error => {
                torrentResult.textContent = 'Error: ' + error;
                torrentResult.className = 'mt-2 text-sm text-red-600';
            });
        } else {
            torrentResult.textContent = 'Please enter a valid magnet link.';
            torrentResult.className = 'mt-2 text-sm text-red-600';
        }
    }

    function uploadFile() {
        if (!fileInput || !progressBarContainer || !progressBar || !uploadStatus) return;

        const file = fileInput.files[0];
        if (!file) {
            showStatus('Please select a file to sned !', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateProgressBar(percentComplete);
                showStatus(`Sneding up: ${percentComplete.toFixed(2)}%`, 'info');
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showStatus('Upload successful yaay!', 'success');
                addUploadedItem(response.file_url, file.name);
                updateStorageUsage();
            } else {
                showStatus('Upload failed: ' + xhr.responseText, 'error');
            }
        };

        xhr.onerror = function() {
            showStatus("Didn't work (sounds like a skill issue). Please try again or dm meek lol", 'error');
        };

        xhr.ontimeout = function() {
            showStatus('The upload timed out. The file might be too large or the connection too slow. Please try again or contact support.', 'error');
        };

        xhr.timeout = 3600000; // Set timeout to 1 hour

        progressBarContainer.classList.remove('hidden');
        xhr.send(formData);
    }

    function updateProgressBar(percentage) {
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    function showStatus(message, type) {
        if (uploadStatus) {
            uploadStatus.textContent = message;
            uploadStatus.className = `mt-4 p-3 rounded-md ${type === 'error' ? 'bg-red-100 text-red-700' : type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`;
        }
    }

    function addUploadedItem(url, fileName) {
        if (!uploadedList) return;

        const item = document.createElement('div');
        item.className = 'bg-gray-100 p-3 rounded-md mt-2 flex justify-between items-center';
        item.innerHTML = `
            <a href="${url}" target="_blank" class="text-purple-600 hover:text-purple-800 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                ${fileName}
            </a>
            <div>
                <button class="preview-file text-blue-600 hover:text-blue-800 mr-2" data-file="${url}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                </button>
                <button class="delete-file text-red-600 hover:text-red-800" data-file="${url.split('/').pop()}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
        uploadedList.appendChild(item);

        item.querySelector('.delete-file').addEventListener('click', function() {
            deleteFile(this.dataset.file);
        });

        item.querySelector('.preview-file').addEventListener('click', function() {
            previewFile(this.dataset.file);
        });
    }

    function deleteFile(fileName) {
        if (confirm('Are you sure you want to DELETE this file?')) {
            showLoading();
            fetch(`/api/file/${fileName}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        showStatus(data.message, 'success');
                        updateFileList();
                        updateStorageUsage();
                    } else {
                        showStatus(data.error, 'error');
                    }
                    hideLoading();
                })
                .catch(error => {
                    showStatus('Error un-meeking file: ' + error, 'error');
                    hideLoading();
                });
        }
    }

    function previewFile(url) {
        showLoading();
        fetch(url)
            .then(response => {
                const contentType = response.headers.get('content-type');
                if (contentType.startsWith('image/')) {
                    return response.blob().then(blob => URL.createObjectURL(blob));
                } else if (contentType.startsWith('video/')) {
                    return response.blob().then(blob => URL.createObjectURL(blob));
                } else if (contentType.startsWith('text/') || contentType === 'application/javascript') {
                    return response.text();
                } else {
                    throw new Error('Unsupported file type for preview');
                }
            })
            .then(content => {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                
                let previewContent;
                if (typeof content === 'string') {
                    if (codeEditor) {
                        codeEditor.classList.remove('hidden');
                        editor.setValue(content);
                        editor.refresh();
                        previewContent = codeEditor;
                    }
                } else if (content.startsWith('blob:')) {
                    if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
                        previewContent = document.createElement('video');
                        previewContent.src = content;
                        previewContent.controls = true;
                        previewContent.autoplay = true;
                    } else {
                        previewContent = document.createElement('img');
                        previewContent.src = content;
                    }
                    previewContent.className = 'max-w-full max-h-full';
                }
                
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.className = 'absolute top-4 right-4 bg-white text-black px-4 py-2 rounded';
                closeButton.onclick = () => {
                    document.body.removeChild(previewContainer);
                    if (codeEditor) {
                        codeEditor.classList.add('hidden');
                    }
                };
                
                previewContainer.appendChild(previewContent);
                previewContainer.appendChild(closeButton);
                document.body.appendChild(previewContainer);
                hideLoading();
            })
            .catch(error => {
                showStatus('Error previewing file: ' + error, 'error');
                hideLoading();
            });
    }

    function updateFileList() {
        showLoading();
        fetch('/api/files')
            .then(response => response.json())
            .then(data => {
                if (uploadedList) {
                    uploadedList.innerHTML = '<h2 class="text-xl font-semibold mb-4 text-gray-800">Your Things:</h2>';
                    data.files.forEach(file => {
                        addUploadedItem(`/v/${file}`, file);
                    });
                }
                hideLoading();
            });
    }

    function updateStorageUsage() {
        fetch('/api/storage-usage')
            .then(response => response.json())
            .then(data => {
                const usageElement = document.querySelector('.storage-usage');
                const barElement = document.querySelector('.storage-bar');
                
                if (usageElement && barElement) {
                    usageElement.textContent = `${data.usage.toFixed(2)} GB / ${data.limit} GB`;
                    barElement.style.width = `${(data.usage / data.limit) * 100}%`;
                } else {
                    console.error('Storage usage elements not found in the DOM');
                }
            })
            .catch(error => {
                console.error('Error updating storage usage:', error);
            });
    }

    function showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.remove('hidden', 'opacity-0');
        loadingOverlay.classList.add('opacity-100');
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('opacity-0');
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 500); 
    }

    function simulateLoading(callback, minTime = 500, maxTime = 1000) {
        showLoading();
        const loadingTime = Math.random() * (maxTime - minTime) + minTime;
        setTimeout(() => {
            hideLoading();
            if (callback) callback();
        }, loadingTime);
    }

    simulateLoading(updateFileList);
});