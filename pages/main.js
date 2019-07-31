if(!remote.getGlobal('darwin')) {
  document.getElementById('dragger').remove()
}


//:::: GLOBAL FUNCTIONS ::::\\

function signout() {
  remote.getGlobal('disconnect')()
}

function openDonate() {
  remote.getGlobal('openExternal')('https://paypal.me/CodingBobby')
}

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
