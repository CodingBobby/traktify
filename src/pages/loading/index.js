let slideIndex = 0;
initialize();

/**
 * Gets an array of file paths (loading images) and proceeds to shuffle them.
 * Shuffling is done to create a random start each time the user is loading.
 * 
 * To be replaced later with an appropriate function that dynamically gets the files path 
 */
function initialize() {
  const imgs = [
    '../../assets/media/loading/Make the app your own personalized space..png',
    '../../assets/media/loading/Search anything you want with no effort..png',
    '../../assets/media/loading/Your favourite content in one place..png'
  ];
  
  shuffleArray(imgs).forEach(img => {
    carousel.innerHTML += createSlide(img)
  });
  
  playSlides()
}

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
  setTimeout(startSlide, 8000)
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
 * @param {string} path directory of the image
 * @returns {string} 
 */
function createSlide(path) {
  return `
  <div class="wrapper">
    <h1 class="fs32 fwSemiBold">${path.split('/').pop().replace('.png', '')}</h1>
    <img src="${path}">
  </div>
  `
}
