let csvData = [];
let sortOrder = 'desc';
let audioElement = document.getElementById("audioElement");
let currentSongIndex = -1;
let playlistSongs = [];

async function loadCSVData() {
  try {
    const response = await fetch('/data');
    if (!response.ok) throw new Error('Erreur HTTP : ' + response.status);

    const data = await response.json();
    csvData = data;
    console.log('Données stockées:', csvData.length);

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

function createSongElement(song, isPlaylist = false) {
  const songDiv = document.createElement('div');
  songDiv.classList.add('song');

  if (!isPlaylist) {
    const img = document.createElement('img');
    img.src = song.Png;
    img.alt = song.Title;
    img.classList.add('song-image');
    songDiv.appendChild(img);
  }

  const scrollingTextContainer = document.createElement('div');
  scrollingTextContainer.classList.add('scrolling-text-container');

  const title = document.createElement('p');
  title.textContent = song.Title;
  title.classList.add('scrolling-text');

  scrollingTextContainer.appendChild(title);
  songDiv.appendChild(scrollingTextContainer);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.classList.add('buttons-container');

  if (isPlaylist) {
    songDiv.setAttribute('data-src', song.Mp3);

    const moveUpButton = document.createElement('button');
    moveUpButton.textContent = '⬆️';
    moveUpButton.onclick = function() { moveUp(this); };

    const moveDownButton = document.createElement('button');
    moveDownButton.textContent = '⬇️';
    moveDownButton.onclick = function() { moveDown(this); };

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Retirer';
    removeButton.classList.add('rm_song');
    removeButton.onclick = function() { removeFromPlaylist(this); };

    buttonsContainer.appendChild(moveUpButton);
    buttonsContainer.appendChild(moveDownButton);
    buttonsContainer.appendChild(removeButton);
  } else {
    const playButton = document.createElement('button');
    playButton.textContent = '➕';
    playButton.id = 'browser_button';
    playButton.addEventListener('click', () => {
      addToPlaylist(song.Title, song.Mp3);
      showCustomAlert(`"${song.Title}" ajoute a la playlist 🎵`);
    });

    const clipButton = document.createElement('button');
    clipButton.textContent = '🎬';
    clipButton.id = 'browser_button';
    clipButton.addEventListener('click', () => {
      window.open(song.Mp4, '_blank');
    });

    buttonsContainer.appendChild(playButton);
    buttonsContainer.appendChild(clipButton);
  }

  songDiv.appendChild(buttonsContainer);
  return songDiv;
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
    const songElement = createSongElement(song);
    songList.appendChild(songElement);
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

function setupMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "No playing",
      artist: "Unknown Artist",
      album: "Unknown Album",
      artwork: [{ src: "https://cdn.glitch.global/cefd793b-5fb5-4078-b9e3-0461a20468dd/logo.png?v=1747786654808", sizes: "512x512", type: "image/jpg" }]
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioElement.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audioElement.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playSong(currentSongIndex - 1);
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playSong(currentSongIndex + 1);
    });
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCSVData();
  setupMediaSession();
  registerServiceWorker();

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
  const songDiv = button.closest('.song');
  const previousSongDiv = songDiv.previousElementSibling;

  if (previousSongDiv) {
    songDiv.parentNode.insertBefore(songDiv, previousSongDiv);
    savePlaylist();
  }
}

function moveDown(button) {
  const songDiv = button.closest('.song');
  const nextSongDiv = songDiv.nextElementSibling;

  if (nextSongDiv) {
    songDiv.parentNode.insertBefore(nextSongDiv, songDiv);
    savePlaylist();
  }
}

function addToPlaylist(songTitle, songSrc) {
  const playlistContent = document.getElementById("playlistContent");
  if ([...playlistContent.children].some(song => song.getAttribute("data-src") === songSrc)) {
    return;
  }

  const song = { Title: songTitle, Mp3: songSrc };
  const songElement = createSongElement(song, true);
  playlistContent.appendChild(songElement);
  savePlaylist();
}

function removeFromPlaylist(button) {
  const songDiv = button.closest('.song');
  songDiv.remove();
  savePlaylist();
  checkAndResetPlayer();
}

function savePlaylist() {
  const songs = [...document.querySelectorAll("#playlistContent .song")].map(song => ({
    title: song.querySelector("p").textContent,
    src: song.getAttribute("data-src")
  }));

  localStorage.setItem("playlist", JSON.stringify(songs));
  checkAndResetPlayer();
}

function loadPlaylist() {
  const storedPlaylist = localStorage.getItem("playlist");
  const playlistContent = document.getElementById("playlistContent");

  if (storedPlaylist) {
    playlistContent.innerHTML = "";
    JSON.parse(storedPlaylist).forEach(song => {
      const songObj = { Title: song.title, Mp3: song.src };
      const songElement = createSongElement(songObj, true);
      playlistContent.appendChild(songElement);
    });
  }
  checkAndResetPlayer();
}

function checkAndResetPlayer() {
  const playlistContent = document.getElementById("playlistContent");
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
  document.getElementById("playerTitle").textContent = song.title;

  if ('mediaSession' in navigator) {
    const artworkSrc = song.Png || "https://cdn.glitch.global/cefd793b-5fb5-4078-b9e3-0461a20468dd/logo.png?v=1747786654808";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: "Artist",
      album: "Album",
      artwork: [{
        src: artworkSrc,
        sizes: "512x512",
        type: "image/jpg"
      }]
    });
  }

  audioElement.play();
  document.getElementById("playPauseButton").textContent = "❚❚";
}


document.getElementById("playPauseButton").addEventListener("click", function () {
  if (audioElement.paused) {
    if (currentSongIndex === -1) {
      playSong(0);
    } else {
      audioElement.play();
    }
    document.getElementById("playPauseButton").textContent = "❚❚";
  } else {
    audioElement.pause();
    document.getElementById("playPauseButton").textContent = "▶";
  }
});

document.getElementById("prevButton").addEventListener("click", function () {
  if (playlistSongs.length > 0) {
    playSong(currentSongIndex - 1);
  }
});

document.getElementById("nextButton").addEventListener("click", function () {
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
  document.getElementById("currentTime").textContent = `${currentMinutes}:${currentSeconds < 10 ? "0" : ""}${currentSeconds}`;

  let totalMinutes = Math.floor(audioElement.duration / 60);
  let totalSeconds = Math.floor(audioElement.duration % 60);
  if (!isNaN(totalMinutes) && !isNaN(totalSeconds)) {
    document.getElementById("totalTime").textContent = `${totalMinutes}:${totalSeconds < 10 ? "0" : ""}${totalSeconds}`;
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
