let csvData = [];
let sortOrder = 'desc';

async function loadCSVData() {
  try {
    const response = await fetch('/data');
    if (!response.ok) throw new Error('Erreur HTTP : ' + response.status);

    const data = await response.json();
    csvData = data;
    console.log('Données stockées:', csvData);

    sortSongs(); // Initial sorting
  } catch (error) {
    console.error('Erreur:', error);
  }
}


function showCustomAlert(message) {
  const customAlert = document.getElementById('customAlert');
  const customAlertMessage = document.getElementById('customAlertMessage');
  customAlertMessage.textContent = message;
  customAlert.style.display = 'flex';
}

function displaySongs(data) {
  const songList = document.getElementById('songList');
  if (!songList) {
    console.error("Élément avec l'id 'songList' introuvable dans le DOM");
    return;
  }

  songList.innerHTML = '';

  if (!data || !Array.isArray(data) || data.length === 0) {
    songList.innerHTML = '<p>Aucune chanson trouvée.</p>';
    return;
  }

  data.forEach(song => {
    const songDiv = document.createElement('div');
    songDiv.classList.add('song');

    const img = document.createElement('img');
    img.src = song.Png || 'https://cdn.glitch.global/05de98a1-79c1-4327-a9f1-7d0c6536ee65/logo.png?v=1747693747727';
    img.alt = song.Title || 'Artwork';
    img.classList.add('song-image');

    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('buttons-div');

    const playButton = document.createElement('button');
    playButton.textContent = '➕';
    playButton.addEventListener('click', () => {
      addToPlaylist(song.Title, song.Mp3);
      showCustomAlert(`"${song.Title}" ajouté à la playlist 🎵`);
    });

    const clipButton = document.createElement('button');
    clipButton.textContent = '🎬';
    clipButton.addEventListener('click', () => {
      window.open(song.Mp4, '_blank');
    });

    const title = document.createElement('p');
    title.textContent = song.Title;
    title.classList.add('song-title', 'scrolling-text'); // Ajoutez la classe scrolling-text à tous les titres

    buttonsDiv.appendChild(playButton);
    buttonsDiv.appendChild(clipButton);

    songDiv.appendChild(img);
    songDiv.appendChild(title);
    songDiv.appendChild(buttonsDiv);

    songList.appendChild(songDiv);
  });
}

function sortSongs() {
  const sortBy = document.getElementById('sortSelect').value;
  const sortedData = [...csvData].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'Title') {
      comparison = a.Title.localeCompare(b.Title);
    } else if (sortBy === 'ReleaseDate') {
      comparison = new Date(a.ReleaseDate) - new Date(b.ReleaseDate);
    } else if (sortBy === 'PlayCount') {
      comparison = a.PlayCount - b.PlayCount;
    } else if (sortBy === 'Time') {
      const timeA = a.Time.split(':').reduce((acc, time) => acc * 60 + parseInt(time, 10), 0);
      const timeB = b.Time.split(':').reduce((acc, time) => acc * 60 + parseInt(time, 10), 0);
      comparison = timeA - timeB;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  displaySongs(sortedData);
}

function searchSong(input) {
  const searchTerm = input.trim().toLowerCase();
  if (!searchTerm) {
    sortSongs();
    return;
  }

  const filteredSongs = csvData.filter(song => {
    const title = (song.Title || '').toLowerCase();
    return title.includes(searchTerm);
  });

  displaySongs(filteredSongs);
}

document.addEventListener('DOMContentLoaded', () => {
  loadCSVData();

  document.getElementById('searchBar').addEventListener('input', (event) => {
    searchSong(event.target.value);
  });

  document.getElementById('sortSelect').addEventListener('change', sortSongs);

  document.getElementById('sortOrderToggle').addEventListener('click', function() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    document.getElementById('sortOrderToggle').textContent = sortOrder === 'asc' ? '⬇️' : '⬆️';
    sortSongs();
  });
});

function addPlayCount(title) {
  fetch('https://dj-azerty-blog.glitch.me/increment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
  .then(async (res) => {
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(`Erreur serveur: ${errMsg}`);
    }
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Réponse non-JSON reçue.');
    }
    return res.json();
  })
  .then((data) => {
    console.log(data.message || data.error);
  })
  .catch((error) => {
    console.error("Erreur PlayCount :", error.message || error);
  });
}

function switchView(view) {
  closeBrowser();
  closePlaylist();

  if (view === "search") {
    openBrowser();
  } else if (view === "playlist") {
    openPlaylist();
  }
}

function headerClick(event) {
  if (event.target === event.currentTarget) {
    switchView('home');
  }
}

function openBrowser() {
  document.getElementById("browser").style.display = "block";
}

function closeBrowser() {
  document.getElementById("browser").style.display = "none";
}

function openPlaylist() {
  document.getElementById("playlistContainer").style.display = "block";
  document.body.classList.add("noscroll");
}

function closePlaylist() {
  document.getElementById("playlistContainer").style.display = "none";
  document.body.classList.remove("noscroll");
}

document.addEventListener("DOMContentLoaded", function () {
  loadPlaylist();
});

function moveUp(button) {
  let songDiv = button.parentElement;
  let previousSongDiv = songDiv.previousElementSibling;

  if (previousSongDiv) {
    songDiv.parentNode.insertBefore(songDiv, previousSongDiv);
    savePlaylist();
  }
}

function moveDown(button) {
  let songDiv = button.parentElement;
  let nextSongDiv = songDiv.nextElementSibling;

  if (nextSongDiv) {
    songDiv.parentNode.insertBefore(nextSongDiv, songDiv);
    savePlaylist();
  }
}



function addToPlaylist(songTitle, songSrc) {
  let playlistContent = document.getElementById("playlistContent");

  if ([...playlistContent.children].some(song => song.getAttribute("data-src") === songSrc)) {
    return;
  }

  let songDiv = document.createElement("div");
  songDiv.classList.add("song");
  songDiv.setAttribute("data-src", songSrc);

  let title = document.createElement("p");
  title.textContent = songTitle;
  title.classList.add("song-title");

  let buttonsContainer = document.createElement("div");
  buttonsContainer.classList.add("buttons-container");

  let moveUpButton = document.createElement("button");
  moveUpButton.textContent = "⬆️";
  moveUpButton.onclick = function() { moveUp(this); };

  let moveDownButton = document.createElement("button");
  moveDownButton.textContent = "⬇️";
  moveDownButton.onclick = function() { moveDown(this); };

  let removeButton = document.createElement("button");
  removeButton.textContent = "Retirer";
  removeButton.onclick = function() { removeFromPlaylist(this); };

  buttonsContainer.appendChild(moveUpButton);
  buttonsContainer.appendChild(moveDownButton);
  buttonsContainer.appendChild(removeButton);

  songDiv.appendChild(title);
  songDiv.appendChild(buttonsContainer);

  playlistContent.appendChild(songDiv);

  // Vérifiez si le texte dépasse
  checkTextOverflow(title);

  savePlaylist();
}


function addDragAndDropEvents(songDiv) {
  songDiv.addEventListener('dragstart', dragStart);
  songDiv.addEventListener('dragover', dragOver);
  songDiv.addEventListener('drop', drop);
  songDiv.addEventListener('dragenter', dragEnter);
  songDiv.addEventListener('dragleave', dragLeave);
}

let dragSrcEl = null;

function dragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', null);
  this.style.opacity = "0.5";
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function drop(e) {
  e.preventDefault();
  if (dragSrcEl !== this) {
    let playlistContent = document.getElementById("playlistContent");
    let children = [...playlistContent.children];
    let srcIndex = children.indexOf(dragSrcEl);
    let targetIndex = children.indexOf(this);

    if (srcIndex < targetIndex) {
      if (this.nextSibling) {
        playlistContent.insertBefore(dragSrcEl, this.nextSibling);
      } else {
        playlistContent.appendChild(dragSrcEl);
      }
    } else {
      playlistContent.insertBefore(dragSrcEl, this);
    }
    dragSrcEl.style.opacity = "1";
    savePlaylist();
  }
}

function dragEnter(e) {
  this.style.backgroundColor = '#444';
}

function dragLeave(e) {
  this.style.backgroundColor = '';
}

function checkAndResetPlayer() {
  let playlistContent = document.getElementById("playlistContent");
  if (playlistContent.children.length === 0) {
    resetPlayer();
  }
}

function resetPlayer() {
  document.getElementById("playerTitle").textContent = "No playing";
  document.getElementById("currentTime").textContent = "0:00";
  document.getElementById("totalTime").textContent = "0:00";
  audioElement.pause();
  audioElement.currentTime = 0;
  document.getElementById("progressBar").style.width = "0%";
}

function removeFromPlaylist(button) {
  button.parentElement.remove();
  savePlaylist();
  checkAndResetPlayer();
}

function savePlaylist() {
  let songs = [...document.querySelectorAll("#playlistContent .song")].map(song => ({
    title: song.querySelector("p").textContent,
    src: song.getAttribute("data-src")
  }));

  localStorage.setItem("playlist", JSON.stringify(songs));
  checkAndResetPlayer();
}

function loadPlaylist() {
  let storedPlaylist = localStorage.getItem("playlist");
  if (storedPlaylist) {
    let playlistContent = document.getElementById("playlistContent");
    playlistContent.innerHTML = "";
    JSON.parse(storedPlaylist).forEach(song => {
      let songDiv = document.createElement("div");
      songDiv.classList.add("song");
      songDiv.setAttribute("data-src", song.src);
      songDiv.innerHTML = `
        <p>${song.title}</p>
        <button onclick="moveUp(this)">⬆️</button>
        <button onclick="moveDown(this)">⬇️</button>
        <button id="rm_song" onclick="removeFromPlaylist(this)">Retirer</button>
      `;

      playlistContent.appendChild(songDiv);
    });
  }
  checkAndResetPlayer();
}


// Gestion du lecteur audio
let audioElement = document.getElementById("audioElement");
let playPauseButton = document.getElementById("playPauseButton");
let prevButton = document.getElementById("prevButton");
let nextButton = document.getElementById("nextButton");
let playerTitle = document.getElementById("playerTitle");
let currentTimeDisplay = document.getElementById("currentTime");
let totalTimeDisplay = document.getElementById("totalTime");

let currentSongIndex = -1;
let playlistSongs = [];

function updatePlaylistSongs() {
  playlistSongs = [...document.querySelectorAll("#playlistContent .song")].map(song => ({
    title: song.querySelector("p").textContent,
    src: song.getAttribute("data-src")
  }));
}

function playSong(index) {
  updatePlaylistSongs();

  if (playlistSongs.length === 0) return;

  if (index < 0) index = playlistSongs.length - 1;
  if (index >= playlistSongs.length) index = 0;

  currentSongIndex = index;
  let song = playlistSongs[currentSongIndex];

  audioElement.src = song.src;
  playerTitle.textContent = song.title;
  audioElement.play();
  playPauseButton.textContent = "❚❚";
}

playPauseButton.addEventListener("click", function () {
  if (audioElement.paused) {
    if (currentSongIndex === -1) {
      playSong(0);
    } else {
      audioElement.play();
    }
    playPauseButton.textContent = "❚❚";
  } else {
    audioElement.pause();
    playPauseButton.textContent = "▶";
  }
});

prevButton.addEventListener("click", function () {
  if (playlistSongs.length > 0) {
    playSong(currentSongIndex - 1);
  }
});

nextButton.addEventListener("click", function () {
  if (playlistSongs.length > 0) {
    playSong(currentSongIndex + 1);
  }
});

audioElement.addEventListener("ended", function () {
  if (currentSongIndex !== -1 && playlistSongs[currentSongIndex]) {
    const finishedTitle = playlistSongs[currentSongIndex].title;
    addPlayCount(finishedTitle);
  }

  playSong(currentSongIndex + 1);
});

audioElement.addEventListener("timeupdate", function () {
  let currentMinutes = Math.floor(audioElement.currentTime / 60);
  let currentSeconds = Math.floor(audioElement.currentTime % 60);
  currentTimeDisplay.textContent = `${currentMinutes}:${currentSeconds < 10 ? "0" : ""}${currentSeconds}`;

  let totalMinutes = Math.floor(audioElement.duration / 60);
  let totalSeconds = Math.floor(audioElement.duration % 60);
  if (!isNaN(totalMinutes) && !isNaN(totalSeconds)) {
    totalTimeDisplay.textContent = `${totalMinutes}:${totalSeconds < 10 ? "0" : ""}${totalSeconds}`;
  }
});

let progressContainer = document.getElementById("progressContainer");
let progressBar = document.getElementById("progressBar");

audioElement.addEventListener("timeupdate", function () {
  if (audioElement.duration) {
    let progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.style.width = progressPercent + "%";
  }
});

progressContainer.addEventListener("click", function (e) {
  let clickPosition = (e.offsetX / progressContainer.offsetWidth) * audioElement.duration;
  audioElement.currentTime = clickPosition;
});
