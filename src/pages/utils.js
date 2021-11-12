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
  alertError(reason)
})

/**
 * Toggles the visibility of the alertbox with its overlay.
 * @param {HTMLElement} type 
 * @param {boolean} cond 
 */
function toggleAlert(type, cond) {
  if (cond) {
    type.classList.add('show');
  } else {
    type.classList.remove('show');
  }
}

/**
 * Modifies the content of the alertbox given that its provided the content it needs.
 * @param {HTMLElement} type 
 * @param {string} title
 * @param {string} text
 * @param {{text: string, cb: function}} btn must have both button name as well as its function
 * @param {{text: string, cb: function}} btn2 
 */
function setAlertbox(type, title, text, btn, btn2) {
  type.innerHTML = `
    <div class="overlay"></div>
    <div class="alertbox shadow">
      <h3 class="fs23 fwSemiBold">${title}</h3>
      <hr>
      <p class="fs18 fwMedium tWhite2">${text}</p>
      <div>
        ${btn2 ? `<div class="fs16 fwMedium btn">${btn2.text}</div>` : ``}
        <div class="fs16 fwMedium btn">${btn.text}</div>
      </div>
    </div>
  `
  let btnsElm = type.children[1].children[3];

  if (btn2) {
    btnsElm.children[0].onclick = btn2.cb;
    btnsElm.children[1].onclick = btn.cb
  } else {
    btnsElm.children[0].onclick = btn.cb
  }
}

/**
 * Generalized alertbox for error handling.
 * @param {string} message 
 */
function alertError(message) {
  setAlertbox(appAlerts, 'Error', message, {
    text: 'reload',
    cb: () => window.location.reload()
  })

  toggleAlert(appAlerts, true)
}

/**
 * Takes an array and filters it with the provided conditions. 
 * @returns {Array} filtered array
 */
function filterItems(items, filter) {
  return items.filter(item => {
    for (let key in filter) {
      if (item[key] != filter[key]) return false
    }
    
    return true
  })
}