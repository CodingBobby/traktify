/**
 * Handles the visibility and modification of the progress bar.
 * It also changes text to let the user know what is currently being loaded.
 */
window.traktify.listen('report.progress', info => {
  progress.style.display = 'block';
  progress.children[0].innerText = info.message;
  progress.children[1].children[0].style.width = `${Math.round(info.fraction*100)}%`;

  if (info.fraction == 1) {
    progress.style.display = 'none'
  }
})