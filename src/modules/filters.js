/**
 * @typedef {Object} FILTERED
 * @property {string} found
 * @property {string} filtered 
 */

/**
 * Filters an input string according to a special format.
 * @example 'tv:firefly' -> { found: 'tv', filterd: 'firefly' }
 * @param {string} string the full input text
 * @param {string[]} prefixes list of possible prefixes
 * @param {string} [removeFromFilter] hyphen to remove afterwards
 * @returns {FILTERED}
 */
function startsWithFilter(string, prefixes, removeFromFilter) {
  string = string.toString()
  for(let pre in prefixes) {
    if(string.startsWith(prefixes[pre])) {
      return {
        filtered: string.split(prefixes[pre])[1],
        found: prefixes[pre].split(removeFromFilter || '').join('')
      }
    }
  }
  
  return {
    found: null,
    filtered: string
  }
}


/**
 * List of available shortcuts that can be used to query trakt.tv searches.
 * @type {string[]}
 */
const searchShortCuts = [
  's', 'show', 'shows', 'tv',
  'm', 'movie',
  'e', 'ep', 'episode',
  'p', 'person'
]


/**
 * @typedef {Object} FILTERED_EXT
 * @property {string} found
 * @property {string} filtered 
 * @property {'show'|'movie'|'episode'|'person'} type
 */

/**
 * To sent API requests, we need a properly formed query.
 * This formats the raw input text into a usable object.
 * @param {string} text user's input string
 * @return {FILTERED_EXT}
 */
function formatSearch(text) {
  let searchOptions = searchShortCuts.map(o => o + ':')

  let query = startsWithFilter(text, searchOptions, ':')

  // This converts the simplified search type into a request-friendly one
  switch(query.found) {
    case 's':
    case 'show':
    case 'shows':
    case 'tv': {
      query.type = 'show'
      break
    }
    case 'm':
    case 'movie': {
      query.type = 'movie'
      break
    }
    case 'e':
    case 'ep':
    case 'episode': {
      query.type = 'episode'
      break
    }
    case 'p':
    case 'person': {
      query.type = 'person'
      break
    }
    default: {
      break
    }
  }

  return query
}


module.exports = {
  startsWithFilter, formatSearch, searchShortCuts
}
