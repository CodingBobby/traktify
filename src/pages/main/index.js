const dummyData = [
  {
    id: 65930,
    title: 'My Hero Academia',
    poster: 'https://walter.trakt.tv/images/shows/000/104/311/posters/thumb/af633add9b.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/104/311/fanarts/full/22c3c6efc2.jpg',
    watched: 89,
    aired: 113,
    season: {
      count: 5,
      poster: 'https://walter.trakt.tv/images/seasons/000/236/954/posters/thumb/76b746ab1e.jpg'
    },
    episode: {
      id: 65930,
      title: 'Vestiges',
      count: 2,
      absolute_count: 90,
      rating: 7.8,
      runtime: 24,
    }
  },
  {
    id: 123446,
    title: 'The Great Jahy Will Not Be Defeated!',
    poster: 'https://walter.trakt.tv/images/seasons/000/255/423/posters/thumb/09aa5ef81e.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/179/526/fanarts/full/adbedecb31.jpg',
    watched: 8,
    aired: 14,
    season: {
      count: 1,
    },
    episode: {
      id: 123446,
      title: 'Saurva Can\'t Catch a Break...',
      count: 9,
      rating: 7.1,
      runtime: 24,
    }
  },
  {
    id: 118821,
    title: 'The World\'s Finest Assassin Gets Reincarnated in Another World as an Aristocrat',
    poster: 'https://walter.trakt.tv/images/shows/000/175/074/posters/thumb/5515ffd419.jpg',
    poster_wide: 'https://walter.trakt.tv/images/shows/000/175/074/fanarts/full/271fc6689c.jpg',
    watched: 4,
    aired: 5,
    season: {
      count: 1,
    },
    episode: {
      id: 118821,
      title: 'Qualifications of Assassins',
      count: 5,
      rating: 7.1,
      runtime: 24,
    }
  },
]
/**
 * Will be fully documented once there has been a proper API as its subject to change completely once implemented.
 */
setTimeout(() => {
  untw.querySelectorAll('[loading]').forEach(elm => {
    elm.removeAttribute('loading')
  });

  Array.from(untw.children).forEach((elm, i) => {
    if (i > 0) {
      let data = dummyData[i-1];

      if (data) {
        elm.dataset.untwId = data.episode.id;
        elm.dataset.untwTitle = data.title;
        elm.dataset.untwEpisode = parseEpisodeTitle(data);
        elm.style.backgroundImage = `url(${parseEpisodeImage(elm, data)})`;
        
        elm.onmouseover = () => {
          updateTextUNTW(elm);
          toggleEpisodeInfo(elm, true)
        };

        elm.onmouseleave = () => {
          updateTextUNTW(untw.querySelector('[data-untw-latest]'));
          toggleEpisodeInfo(elm, false)
        };

        elm.innerHTML = `
          <div>
            <div class="fs16 fwSemiBold">
              <div class="actions">
                <div class="btn small red">play now</div>
                <div class="btn small" style="background-color:var(--watchlist)"><i class="icon-watchlist"></i></div>
              </div>
              <div class="rating"><i class="icon-heart"></i> ${data.episode.rating}</div>
            </div>
            <div class="progress">
              <div style="width:${getProgressRatio(data.watched, data.aired)}%"></div>
            </div>
          </div>
        `;
        
        
        elm.querySelector('.actions').children[0].onclick = () => {
          modifyAlertbox(
            'Info',
            `Start playing <span>${data.title}: ${parseEpisodeTitle(data)}</span>?`,
            {text: 'ok', cb: () => window.location.reload()},
            {text: 'revert action', cb: () => toggleAlert(false)
          })
          toggleAlert(true)
        }

        elm.querySelector('.actions').children[1].onclick = () => {
          modifyAlertbox(
            'Info',
            `Add <span>${data.title}: ${parseEpisodeTitle(data)}</span> to your watchlist?`,
            {text: 'ok', cb: () => window.location.reload()},
            {text: 'revert action', cb: () => toggleAlert(false)
          })
          toggleAlert(true)
        }
        
      } else {
        elm.style = 'background-color:var(--watchlist);'
      }
    }
  })

  updateTextUNTW(untw.querySelector('[data-untw-latest]'))
}, 2000)

/**
 * Updates show and episode name in UNTW.
 * @param {HTMLElement} tile 
 */
function updateTextUNTW(tile) {
  let text = untw.children[0];

  text.children[0].innerHTML = 'up next to watch';
  text.children[1].innerHTML = tile.dataset.untwTitle;
  text.children[2].innerHTML = tile.dataset.untwEpisode
}

/**
 * Shows the episode's interactive components.
 * @param {HTMLElement} tile
 * @param {boolean} cond
 */
function toggleEpisodeInfo(tile, cond) {
  if (!isMainTile(tile)) {
    tile.children[0].style.bottom = cond ? '0' : '-88px'    
  }
}

/**
 * Checks if the tile provided is the main tile, the one that takes most space.
 * @param {HTMLElement} tile
 * @returns {boolean}
 */
function isMainTile(tile) {
  return tile.dataset.untwLatest == ''
}

/**
 * Calculates the ratio between number of episodes watched to total aired episodes in percentage for progress bar.
 * @param {number} number number of episodes watched 
 * @param {number} total number of episodes that have aired
 * @returns 
 */
 function getProgressRatio(number, total) {
  return ((number/total)*100).toFixed(1)
}

/**
 * Parses the data from the API to provided a constructed episode title for UNTW.
 * @returns {string} "0 x 00 (0) Episode Title"
 */
function parseEpisodeTitle(data) {
  let show_count = data.episode.absolute_count;
  return `${data.season.count} &#215; ${data.episode.count} ${show_count ? `(${show_count})`: ''} ${data.episode.title}`
}

/**
 * Optimal image for the tiles with fallback for non-existent ones.
 * @param {HTMLElement} tile 
 * @returns {string} image url
 */
 function parseEpisodeImage(tile, data) {
  if (isMainTile(tile)) {
    return data.season.poster || data.poster
  } else {
    return data.season.poster_wide || data.poster_wide || data.season.poster || data.poster
  }
}