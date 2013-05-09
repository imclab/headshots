/*globals pin:true, Bind:true, xhr:true, $:true, alert:true, connection:true, play:true*/
(function () {
"use strict";

var turnEl = $('#turn');
var removeTurnClass = function() {
  this.classList.remove('showTurn');
};

turnEl.on('webkitAnimationEnd', removeTurnClass);
turnEl.on('animationend', removeTurnClass);

var timer = null,
    title = document.title;

function status(callback) {
  clearTimeout(timer);
  xhr.get('/status/' + (pin ? pin : ''), function (err, result) {
    if (err) {
      console.log(this);
      timer = setTimeout(status, 5000);
    }
    if (result) {
      if (result.type === 'ready') {
        window.history.replaceState({}, title, '/play');
        window.game = new Bind(result.data, {
          'me.score': '#myscore',
          'them.score': function (value) {
            $.trigger('theirScore', value);
          },
          'turn': function (myturn) {
            turnEl.dataset.turn = myturn;
            $.trigger('myturn', myturn);
          }
        });
        play.init();
      } else if (result.type === 'start') {
        setPin(result.data.pin);
        window.history.replaceState({}, title, '/start/' + pin);
        status();
      }
    }

    if (callback) {
      callback();
    }
  });
}

function setPin(p, triggerEvent) {
  // make sure it's an int
  p *= 1;

  if (p !== window.pin) {
    triggerEvent = true;
  }

  window.pin = p;
  $('.pincode').forEach(function (el) {
    el.innerHTML = p;
  });

  if (triggerEvent) {
    $.trigger('pinchange', { pin: pin });
  }
}

function joingame(event) {
  event.preventDefault();

  var userpin = $('#userpin'),
      p = userpin.value;

  blur();

  xhr.post('/join', { pin: p }, function (err, result) {
    if (err) {
      console.error('failed to post join');
    } else if (result) {
      setPin(p);
      $('#join').classList.remove('show');
      $('#start').classList.add('show');
      window.history.replaceState({}, title, '/join/' + pin);
      status();
    } else {
      alert('Could not join that game');
    }
  });
}

function pause(event) {
  event.preventDefault();
  window.running = false;
  if (event.type.indexOf('remote') !== 0) {
    $.trigger('pause');
  }
  control.classList.add('show');
}

function resume(event) {
  event.preventDefault();
  window.running = true;
  if (event.type.indexOf('remote') !== 0) {
    $.trigger('resume');
  }
  control.classList.remove('show');
}

function exit(event) {
  event.preventDefault();
  window.location = '/';
}

function tap(el, handler) {
  el.on('touchstart', handler, false);
  el.on('click', handler, false);
}

function getState() {
  var l = window.location,
      state = 'join',
      path;

  // path rules, then hash
  if (l.pathname.indexOf('/play') === 0 && l.hash) {
    path = (l.hash.match(/^#(.*?)\/*(\d+)*\/*$/) || [undefined,undefined,undefined]);
  } else {
    path = (l.pathname.match(/^\/(.*?)\/*(\d+)*\/*$/) || [undefined,undefined,undefined]);
  }

  if (path[2]) {
    pin = path[2];
    state = path[1];
  } else if (path[1]) {
    // no pin so let them enter a pin
    state = path[1];
  } else {
    state = 'join';
  }

  if ((state === 'join' || state === 'start') && path[2] === undefined) {
    pin = null;
  }

  return state;
};

function init(state) {
  console.log(state, pin);
  if (state === 'start' || (state === 'join' && pin)) {
    console.log('showing start');
    // $('#start').classList.add('show');
    showPanel('start');
  } else if (state === 'join') {
    console.log('showing join');
    // $('#join').classList.add('show');
    showPanel('join');
  }

  if (pin || state === 'start') {
    status();
  }
}

// via http://stackoverflow.com/a/8349838/22617
function blur() {
  var field = document.createElement('input');
  field.type = 'text';
  document.body.appendChild(field);

  setTimeout(function() {
    field.focus();
    setTimeout(function() {
        field.style.display = 'none';
        field.parentNode.removeChild(field);
    }, 50);
  }, 50);
}

function showPanel(id) {
  panels.forEach(function (panel) {
    panel.classList.remove('show');
  });
  $('#' + id).classList.add('show');
}

function firstTo3() {
  
}


var control = $('#game-control');

tap($('#pause'), pause);
tap($('#resume'), resume);
tap($('#exit'), exit);
tap($('#joingame'), joingame);

$.on('remotePause', pause);
$.on('remoteResume', resume);

var panels = $('.panel');

$.on('showPanel', function (event) {
  showPanel(event.data);
});

$.on('hit', firstTo3).on('remoteHit', firstTo3);

connection.init();

var state = getState();

if (pin) {
  setPin(pin, true);
}

init(state);

})();