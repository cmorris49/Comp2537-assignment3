const ALL_COL_CLASSES = [
  'grid-cols-2',
  'sm:grid-cols-3',
  'md:grid-cols-4',
  'md:grid-cols-6',
];

const COL_CLASSES = {
  easy: ['grid-cols-2', 'md:grid-cols-3'],           
  medium: ['grid-cols-3', 'md:grid-cols-4'],  
  hard: ['grid-cols-3', 'md:grid-cols-6'],
};

function showWinModal() {$('#winModal').removeClass('hidden');}
function hideWinModal() {$('#winModal').addClass('hidden');}
function showLoseModal() {$('#loseModal').removeClass('hidden');}
function hideLoseModal() {$('#loseModal').addClass('hidden');}

function renderPlaceholders() {
  const diff = $('#difficulty').val().toLowerCase();
  const sizes = { easy: 3, medium: 6, hard: 9 };
  const total = (sizes[diff] || sizes.easy) * 2;

  $('#game_grid')
  .empty()
  .removeClass(ALL_COL_CLASSES.join(' '))
  .addClass(COL_CLASSES[diff].join(' '));
  for (let i = 0; i < total; i++) {
    $('#game_grid').append(`
      <div class="aspect-[701/976]">
        <img src="images/PokemonBack.png" class="block w-full h-full object-contain" />
      </div>
    `);
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(scaleGrid);
  });
}

function scaleGrid() {
  const headerH = $('#status_header').outerHeight();
  const footerH = $('#status_footer').outerHeight();
  const availH  = $(window).height() - headerH - footerH;
  const availW  = $(window).width();
  $('#game_grid').css('transform','none');
  const rect   = $('#game_grid')[0].getBoundingClientRect();
  const scaleX = availW  / rect.width;
  const scaleY = availH  / rect.height;
  const scale  = Math.min(scaleX, scaleY, 1);
  $('#game_grid').css({
    transform: `scale(${scale})`,
    transformOrigin: 'top center'
  });
}

function syncFooterHeight() {
  const h = $('#status_header').outerHeight();
  $('#status_footer').height(h);
  scaleGrid();
}


$(document).ready(() => {
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  $('body')
    .addClass(`${savedTheme}-theme`)
    .removeClass(`${savedTheme === 'light' ? 'dark' : 'light'}-theme`);
  $('#themeToggle').prop('checked', savedTheme === 'dark');

  $('#themeToggle').on('change', function() {
    const newTheme = this.checked ? 'dark' : 'light';
    $('body')
      .toggleClass('dark-theme', this.checked)
      .toggleClass('light-theme', !this.checked);
    localStorage.setItem('theme', newTheme);
  });

  let allPokemon = [];
  // capture the promise so we can await it later
  const loadPromise = $.getJSON('https://pokeapi.co/api/v2/pokemon?limit=1500')
    .then(data => {
      allPokemon = data.results.filter(p => !p.name.includes('-'));
    })
    .catch(err => console.error('Failed to load Pokémon list:', err));

  let firstCard;
  let secondCard;
  let isBoardLocked = false;
  let clickCount = 0;
  let pairsMatched = 0;
  let totalPairs = $(".card").length / 2;
  let peeksRemaining = 1;
  let timerInterval;
  let timeRemaining;

  function setup () {
    $('#game_grid').off('click', '.card').on('click', '.card', function () {  
      if (isBoardLocked || $(this).hasClass('matched')) return;
      const frontImg = $(this).find('.front_face')[0];
      if (firstCard === frontImg) return;

      clickCount++;
      $('#clicks').text(`Clicks: ${clickCount}`);
      $(this).toggleClass('flip');

      if (!firstCard) {
        firstCard = $(this).find(".front_face")[0];
        return;
      }
      secondCard = $(this).find(".front_face")[0];

      if (firstCard.src === secondCard.src) {
        console.log("match");
        const $firstCardEl  = $(`#${firstCard.id}`).closest('.card');
        const $secondCardEl = $(`#${secondCard.id}`).closest('.card');

        $firstCardEl.addClass('matched');
        $secondCardEl.addClass('matched');

        pairsMatched++;
        $("#pairs_matched").text(`Matched: ${pairsMatched}`);
        $("#pairs_left").text(`Left: ${totalPairs - pairsMatched}`);

        firstCard = undefined;
        secondCard = undefined;
        isBoardLocked = false;
        
        if (pairsMatched === totalPairs) {
          clearInterval(timerInterval);
          setTimeout(() => {
            showWinModal();
            $(".card").off("click");
          }, 600);
        }
      } else {
        console.log("no match");
        isBoardLocked = true;
        setTimeout(() => {
          $(`#${firstCard.id}`).closest('.card').toggleClass("flip");
          $(`#${secondCard.id}`).closest('.card').toggleClass("flip");
          firstCard = undefined;
          secondCard = undefined;
          isBoardLocked = false;
        }, 1000)
      }
    });
    scaleGrid();
  }

  function pickRandomPokemon(n) {
    const copy = [...allPokemon];
    const chosen = [];
    for (let i = 0; i < n; i++) {
      const id = Math.floor(Math.random() * copy.length);
      chosen.push(copy.splice(id, 1)[0]);
    }
    return chosen;
  }

  async function startGame() {
    await loadPromise;
    clearInterval(timerInterval);
    clickCount = 0;
    firstCard = undefined;
    secondCard = undefined;
    isBoardLocked = false;
    peeksRemaining = 1;

    const diff = $('#difficulty').val();
    const levels = { easy: 3, medium: 6, hard: 9 };
    totalPairs = levels[diff] || levels.easy;
    pairsMatched = 0;

    $('#peekBtn').text(`Peek (${peeksRemaining})`).prop('disabled', false);
    $("#clicks").text(`Clicks: ${clickCount}`);
    $("#pairs_matched").text(`Matched: ${pairsMatched}`);
    $("#pairs_left").text(`Left: ${totalPairs}`);
    $("#total_pairs").text(`Total: ${totalPairs}`);

    const selected = pickRandomPokemon(totalPairs);
    const pokemonPromises = selected.map(p =>
      $.getJSON(p.url).then(detail => {
        const url = detail.sprites.other?.['official-artwork']?.front_default;
        if (!url) {
          console.warn(`Missing artwork for ${p.name}`);
        }
        return url;
      }).catch(err => {
        console.error(`Error fetching details for ${p.name}:`, err);
        return null;
      })
    );
    let pokemonURLs = await Promise.all(pokemonPromises);
    pokemonURLs = pokemonURLs.filter(url => url);
    if (pokemonURLs.length < totalPairs) {
      console.warn('Not enough sprites, retrying pick');
      return startGame();  
    }
    let deck = pokemonURLs.concat(pokemonURLs);
    deck.sort(() => Math.random() - 0.5);

    $('#game_grid')
      .empty()
      .removeClass(ALL_COL_CLASSES.join(' '))
      .addClass(COL_CLASSES[diff].join(' '));
    deck.forEach((url, i) => {
    const $card = $('<div>')
      .addClass('card w-full aspect-[701/976] relative cursor-pointer')
      .append(
        $('<div>').addClass('card-inner preserve-3d relative w-full h-full flip-rotate')
          .append(
            $('<img>')
              .attr('src', 'images/PokemonBack.png')
              .addClass('back_face backface-hidden absolute inset-0 w-full h-full object-contain rounded-xl shadow-lg'),
            $('<img>')
              .attr('id', `card${i}`)
              .attr('src', url)
              .addClass('front_face backface-hidden absolute inset-0 w-full h-full object-contain rounded-xl shadow-lg rotate-y-180')
          )
      );
      $('#game_grid').append($card);
    });
    console.log('# of cards in #game_grid:', $('#game_grid').children().length);
    scaleGrid();
    setup();

    const timeLimits = { easy: 30, medium: 45, hard: 60 };
    timeRemaining = timeLimits[diff] || 60;
    $("#timer").text(`Time: ${timeRemaining}s`);

    timerInterval = setInterval(() => {
      timeRemaining--;
      $("#timer").text(`Time: ${timeRemaining}s`);
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        $(".card").off("click");
        showLoseModal();
      }
    }, 1000);
  }

  function resetGame() {
    startGame();
  }

  $('#difficulty').on('change', renderPlaceholders);
  $('#difficulty').trigger('change');
  $(window).on('resize', scaleGrid);

  $('#startBtn').on("click", startGame);
  $("#resetBtn").on("click", resetGame);

  $("#total_pairs").text(`Total: 0`);
  $("#pairs_left").text(`Left: 0`);

  $('#peekBtn').on('click', () => {
    if (peeksRemaining === 0) return;
    $('.card:not(.matched)').addClass('flip');
    setTimeout(() => {
      $('.card:not(.matched)').removeClass('flip');
    }, 1000);
    peeksRemaining--;
    $('#peekBtn').text(`🔍 Peek (${peeksRemaining})`);
    if (peeksRemaining === 0) {
      $('#peekBtn').prop('disabled', true);
    }
  });

  $(window).on('load resize', syncFooterHeight);
  syncFooterHeight();

  $('#winCloseBtn').on('click', () => {
    hideWinModal();
    resetGame();
  });
  $('#loseCloseBtn').on('click', () => {
    hideLoseModal();
    resetGame();
  });
});