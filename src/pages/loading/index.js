let slideIndex = 0;
const imgPath = 'assets/media/loading/';

/**
 * Gets an array of file names (loading images) from a path and proceeds to shuffle them.
 * Shuffling is done to create a random start each time the user is loading.
 */
window.traktify.files('./src/' + imgPath).then(result => {
  shuffleArray(result).forEach(name => {
    carousel.innerHTML += createSlide(imgPath, name)
  });
  
  playSlides()
})

/**
 * Starts playing the slides on the page at a fixed interval.
 */
function playSlides() {
  let slide = carousel.children;

  for (let i = 0; i < slide.length; i++) {
    slide[i].style.visibility = 'hidden'
  }

  slideIndex++;

  if (slideIndex > slide.length) {
    slideIndex = 1
  }

  slide[slideIndex - 1].style.visibility = 'visible';
  setTimeout(playSlides, 8000)
}

/**
 * Shuffles an array of string.
 * @param {Array.<string>} array 
 * @returns {Array.<string>}
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }

  return array
}

/**
 * Creates the DOM content for the slide.
 * Since there is some complexity in how paths work between backend and frontend, everything is handled here.
 * @param {string} path directory of the image
 * @returns {string} 
 */
function createSlide(path, filename) {
  return `
  <div class="wrapper">
    <h1 class="fs32 fwSemiBold">${filename.replace('.png', '')}</h1>
    <img src="${'../../' + path + filename}">
  </div>
  `
}
