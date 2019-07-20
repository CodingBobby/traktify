function codeToClipboard() {
  remote.getGlobal('codeToClipboard')()
}

function authenticate() {
  document.getElementById('sign_in_btn').style.display = 'none'
  document.getElementById('sign_in_alert').style.display = 'block'
  document.getElementById('get_code_again').style.display = 'block'
  remote.getGlobal('authenticate')()
}
