let slideIndex = 0;
const imgsPath = 'assets/media/loading/';


/**
 * Gets an array of filenames (loading images) from a path and proceeds to shuffle them.
 * Shuffling is done to create a random start each time the user is loading.
 */
window.traktify.files('./src/' + imgsPath).then(result => {
  shuffleSlides(result).forEach(filename => {
    carousel.innerHTML += `
      <div class="wrapper">
        <h1 class="fs32 fwSemiBold">${filename.replace('.png', '')}</h1>
        <img src="${'../../' + imgsPath + filename}">
      </div>
    `
  });
  
  initSlide()
})


/**
 * Starts playing the slides at a fixed interval.
 */
function initSlide() {
  let slide = carousel.children;

  for (let i = 0; i < slide.length; i++) {
    slide[i].style.visibility = 'hidden'
  }

  slideIndex++;

  if (slideIndex > slide.length) {
    slideIndex = 1
  }

  slide[slideIndex - 1].style.visibility = 'visible';
  setTimeout(initSlide, 8000)
}


/**
 * Shuffles an array of strings.
 * Mainly used to shuffle the slides for a random slide everytime the app is opened.
 * @param {Array.<string>} array 
 * @returns {Array.<string>}
 */
function shuffleSlides(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }

  return array
}