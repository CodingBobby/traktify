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
  for(let property in styles) {
    // just a security check
    if({}.hasOwnProperty.call(styles, property)) {
      element.style[property] = styles[property]
    }
  }
}

function debugLog(...args) {
  remote.getGlobal('debugLog').apply(null, args)
}

function loadImage(parent, src, loadingSrc) {
  let loading_img = document.createElement('img')
  loading_img.src = '../../assets/'+loadingSrc

  parent.appendChild(loading_img)

  let img = document.createElement('img')
  img.src = src

  img.onload = function() {
    setTimeout(() => {
      parent.removeChild(loading_img)
      parent.appendChild(img)
    }, 7*33.3) // some extra animation and framerate buffer
  }
}
