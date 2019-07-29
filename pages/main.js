if(!remote.getGlobal('darwin')) {
  document.getElementById('dragger').remove()
}

function signout() {
  remote.getGlobal('disconnect')()
}

function openDonate() {
  remote.getGlobal('openExternal')('https://paypal.me/CodingBobby')
}

function reload() {
  remote.getGlobal('loadDashboard')()
}

function insertBefore(element, reference) {
  reference.parentNode.insertBefore(element, reference)
}

function css(element, styles) {
  for (let property in styles) {
    element.style[property] = styles[property]
  }
}

function debugLog(...args) {
  remote.getGlobal('debugLog').apply(null, args)
}
