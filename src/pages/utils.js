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

/**
 * Shows an alertbox when an error appears within the app.
 * The user proceeds to click on the reload button instead of the app doing it on its own.
 */
window.traktify.listen('report.error', reason => {
  setAlertbox('Error', reason, {
    text: 'reload',
    cb: () => window.location.reload()
  })

  toggleAlert(true)
})

/**
 * Toggles the visibility of the alertbox with its overlay.
 * @param {boolean} cond 
 */
function toggleAlert(cond) {
  alerts.style.display = cond ? 'flex' : 'none'
}

/**
 * Modifies the content of the alertbox given that its provided the content it needs.
 * @param {string} title
 * @param {string} text
 * @param {{text: string, cb: function}} btn must have both button name as well as its function
 * @param {{text: string, cb: function}} btn2 
 */
function setAlertbox(title, text, btn, btn2) {
  let textElm = alerts.getElementsByTagName('p')[0];
  let btnsElm = textElm.nextElementSibling;

  alerts.getElementsByTagName('h3')[0].innerText = title;
  textElm.innerHTML = text;

  if (btn2) {
    btnsElm.innerHTML = `
      <div class="fs16 fwMedium tWhite2 btn">${btn2.text}</div>
      <div class="fs16 fwMedium btn red">${btn.text}</div>
    `;

    btnsElm.children[0].onclick = btn2.cb;
    btnsElm.children[1].onclick = btn.cb
  } else {
    btnsElm.innerHTML = `<div class="fs16 fwMedium btn red">${btn.text}</div>`;
    btnsElm.children[0].onclick = btn.cb
  }
}