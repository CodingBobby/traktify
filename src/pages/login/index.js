/**
 * Code below handles the authentication of the user. 
 * When login button is triggered it opens a verifcation url and button is replaced with two different buttons.
 */
 actions.children[0].addEventListener('click', () => {
  window.traktify.auth().then(result => {
    code.innerText = result.user_code;
    code.style.display = 'initial';

    // opens verification url on a browser tab
    window.traktify.browse(result.verification_url);

    // replaces login button with two different buttons
    actions.innerHTML = `
      <div class="fs18 fwMedium" data-code="${result.user_code}">copy code</div>
      <div class="fs18 fwMedium" data-url="${result.verification_url}">open url</div>
    `;

    // adds functionality for the new buttons
    actions.children[0].addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.dataset.code)
    })

    actions.children[1].addEventListener('click', (e) => {
      window.traktify.browse(e.target.dataset.url)
    })
  }).catch(err => console.error(err))
}, {once: true})