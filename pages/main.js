if(!remote.getGlobal('darwin')) {
  let dragger = document.getElementById('dragger')
  if(dragger !== null) {
    dragger.remove()
  }
}


//:::: GLOBAL FUNCTIONS ::::\\

function signout() {
  remote.getGlobal('disconnect')()
}

function openDonate() {
  remote.getGlobal('openExternal')('https://paypal.me/CodingBobby')
}

// TODO: Reloading should only fetch latest changes without reloading the html
function reload() {
  remote.getGlobal('loadDashboard')()
}

function debugLog(...args) {
  remote.getGlobal('debugLog').apply(null, args)
}


//:::: HELPERS ::::\\

// inserts an element before another one
function insertBefore(element, reference) {
  reference.parentNode.insertBefore(element, reference)
}

// adds multiple css styles to an element, example:
// styles: { display: 'block', backgroundColor: 'red' }
function css(element, styles) {
  for(let property in styles) {
    // just a security check
    if({}.hasOwnProperty.call(styles, property)) {
      element.style[property] = styles[property]
    }
  }
}

// returns a random item from a given array
function pick(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// works as Array.prototype.length
function getObjectLength(obj) {
  let len = 0
  for(let item in obj) {
    if(obj.hasOwnProperty(item)) {
      len++
    }
  }
  return len
}

// returns array of object's key-value pairs
function objectToArray(obj) {
  let arr = []
  for(let item in obj) {
    arr.push({
      name: item,
      content: obj[item]
    })
  }
  return arr
}

// This handy function allows to delay recursive actions. The taken arguments are explained below
function delayFunction(
  callback, // function that contains whatever you want, takes an index and an optional array
  delay, // the time to wait between iterations in ms
  itemCount, // the maximum count
  arrayToPass=[], // optional array you want to process
  terminateAtIndex=itemCount, // optional index after which the callback is not delayed anymore, can be used when having many out-of-view items where the delay would stack up otherwise
  current=0 // current iteration index, only used by the function itself
) {
  if(itemCount-current > 0) {
    callback(current, arrayToPass)
    if(current >= terminateAtIndex) {
      debugLog('delay', 'terminated')
      delay = 0
    }
    setTimeout(() => {
      delayFunction(callback, delay, itemCount, arrayToPass, terminateAtIndex, current+1)
    }, delay)
  }
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

/**
 * @param {object} options 
 * @param options.parent dom element the image should be appended to
 * @param {'poster'} options.use in what type of element the image will be used
 * @param {'season'} options.type type the item belongs to
 * @param {number} options.itemId tvdb id of the item
 * @param {any} options.reference some reference we can use
 */

async function requestAndLoadImage(options) {
  let loading_img = document.createElement('img')
  // the actual image, the placeholder gets updated to
  let img = document.createElement('img')

  switch(options.use) {
    case 'poster': {
      loading_img.src = '../../assets/loading_placeholder.gif'
      options.parent.appendChild(loading_img)

      switch(options.type) {
        case 'season': {
          img.src = await getSeasonPoster(options.itemId, options.reference)
  
          img.onload = function() {
            setTimeout(() => {
              options.parent.removeChild(loading_img)
              options.parent.appendChild(img)
            }, 3*33.3) // some extra animation and framerate buffer
          }
          break
        }
      }
      break
    }
  }
}
