/*actions.children[0].addEventListener('click', () => {
  window.traktify.auth().then(result => {
    code.innerText = result.user_code;
    code.style.display = 'initial';

    actions.innerHtml = `
      <div class="fs18 fwMedium" value="${result.user_code}">copy code</div>
      <div class="fs18 fwMedium" href="${result.verification_url}">open url</div>
    `

    actions.children[0].addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.value)
    })

    actions.children[1].addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.value)
    })
  }).catch(err => console.error(err))
}, {once: true});*/